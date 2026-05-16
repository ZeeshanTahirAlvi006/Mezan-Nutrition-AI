import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import FoodItem from '../models/FoodItem.js';
import DailyLog from '../models/DailyLog.js';
import { generateChatResponse } from '../services/aiService.js';

// @desc    Create or get a chat session
// @route   POST /api/chat/session
const createOrGetSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    let session;

    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user: req.user._id });
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
    } else {
      session = await ChatSession.create({
        user: req.user._id,
        title: "New Conversation"
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages for a session
// @route   GET /api/chat/session/:sessionId/messages
const getSessionMessages = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const messages = await Message.find({ session: session._id }).sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate AI Chat Response (Frontend-driven loop)
// @route   POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { sessionId, role, content, toolCallId, name, toolCalls, imageUrl } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    // Verify session
    const session = await ChatSession.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.isActive === false) {
      return res.status(403).json({ message: "This conversation has been closed." });
    }

    const allowedRoles = ['user', 'tool'];
    const messageRole = allowedRoles.includes(role) ? role : 'user';

    // Save the incoming message to DB
    const incomingMessage = await Message.create({
      session: session._id,
      role: messageRole,
      content: content || '',
      toolCallId,
      name,
      toolCalls,
      imageUrl
    });

    // Update session title if it's the first user message
    if (session.title === "New Conversation" && role === 'user') {
      const displayContent = content || 'New Image Message';
      session.title = displayContent.substring(0, 30) + (displayContent.length > 30 ? '...' : '');
      await session.save();
    }

    // Fetch history for Mistral
    const history = await Message.find({ session: session._id }).sort('createdAt').lean();

    // Format history for Mistral
    const apiMessages = history.map(m => {
      let msgContent = m.content || "";

      // Handle multimodal Vision input
      if (m.imageUrl) {
        msgContent = [
          { type: "text", text: m.content || "Image uploaded" },
          { type: "image_url", imageUrl: m.imageUrl }
        ];
      }

      const msg = { role: m.role, content: msgContent };

      // Essential for Mistral/Groq: If assistant has tool calls, content can be null or empty string
      // but tool_calls MUST be present.
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id,
          type: tc.type || 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
      }

      if (m.role === 'tool') {
        msg.tool_call_id = m.toolCallId;
        msg.name = m.name;
      }
      return msg;
    }).filter(m => {
      // Final safety: filter out any assistant message that has neither content nor tool_calls
      if (m.role === 'assistant') {
        return m.content || (m.tool_calls && m.tool_calls.length > 0);
      }
      return true;
    });

    // Get response from Mistral (it might return standard text, OR a tool_call)
    const aiResponse = await generateChatResponse(req.user, apiMessages);
    console.log(`[Chat] AI Response received:`, JSON.stringify(aiResponse));

    // Normalize tool calls (handle both snake_case from raw API and camelCase from some SDKs)
    const detectedToolCalls = aiResponse.toolCalls || aiResponse.tool_calls || [];

    // Save AI response to DB
    const aiMessageDoc = {
      session: session._id,
      role: aiResponse.role,
      content: aiResponse.content || '',
    };

    if (detectedToolCalls.length > 0) {
      console.log(`[Chat] Tool calls detected:`, detectedToolCalls.length);
      aiMessageDoc.toolCalls = detectedToolCalls;
    }

    const savedAiMessage = await Message.create(aiMessageDoc);
    console.log(`[Chat] Saved AI message ID:`, savedAiMessage._id);

    res.json(savedAiMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Execute a tool requested by the AI
// @route   POST /api/chat/execute-tool
const executeTool = async (req, res) => {
  try {
    const { toolName, toolArgs, sessionId, toolCallId } = req.body;

    if (!sessionId || !toolCallId) {
      return res.status(400).json({ message: "sessionId and toolCallId are required for security verification." });
    }

    // 1. Verify session ownership
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession || chatSession.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to execute tools in this session." });
    }

    // 2. Verify tool call integrity (Prevent unauthorized tool execution)
    // Find the message that contains this tool call
    const aiMessage = await Message.findOne({
      session: sessionId,
      role: 'assistant',
      'toolCalls.id': toolCallId
    });

    if (!aiMessage) {
      return res.status(403).json({ message: "Invalid or unauthorized tool call execution attempt." });
    }

    // 3. Verify tool name matches the one in the verified tool call
    const verifiedToolCall = aiMessage.toolCalls.find(tc => tc.id === toolCallId);
    if (verifiedToolCall.function.name !== toolName) {
      return res.status(403).json({ message: "Tool name mismatch. Execution denied." });
    }

    if (toolName === 'search_food_database') {
      const { query } = toolArgs;

      // Try Text Search first (Relevance based)
      let foods = await FoodItem.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(3);

      // Fallback to Regex if Text Search is too restrictive
      if (foods.length === 0) {
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        foods = await FoodItem.find({
          name: { $regex: escapeRegex(query), $options: 'i' }
        }).limit(3);
      }

      let resultString = '';
      if (foods.length > 0) {
        resultString = JSON.stringify(foods.map(f => ({
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fats: f.fats,
        })));
      } else {
        resultString = `No food items found matching '${query}'.`;
      }

      return res.json({ result: resultString });
    }

    if (toolName === 'get_user_food_logs') {
      const { date } = toolArgs;
      // Default to today if no date provided
      const targetDate = date ? new Date(date) : new Date();

      // We want to match only the date part
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const log = await DailyLog.findOne({
        userId: req.user._id,
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('foodItems.foodId');

      if (!log || log.foodItems.length === 0) {
        return res.json({ result: `No food logs found for ${targetDate.toDateString()}.` });
      }

      const logData = {
        date: log.date.toDateString(),
        foods: log.foodItems.map(item => ({
          name: item.foodId?.name || 'Unknown Food',
          servings: item.servings,
          calories: (item.foodId?.calories || 0) * item.servings,
          protein: (item.foodId?.protein || 0) * item.servings,
          carbs: (item.foodId?.carbs || 0) * item.servings,
          fats: (item.foodId?.fats || 0) * item.servings,
        })),
        totals: log.totals
      };

      return res.json({ result: JSON.stringify(logData) });
    }

    return res.status(400).json({ message: "Unknown tool" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit feedback for a message
// @route   POST /api/chat/feedback/:messageId
const submitFeedback = async (req, res) => {
  try {
    const { feedback } = req.body; // 'up' or 'down'

    // Find message and populate session to check ownership
    const message = await Message.findById(req.params.messageId).populate('session');

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Verify ownership
    if (message.session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to give feedback on this message" });
    }

    message.feedback = feedback;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createOrGetSession, getSessionMessages, sendMessage, executeTool, submitFeedback };
