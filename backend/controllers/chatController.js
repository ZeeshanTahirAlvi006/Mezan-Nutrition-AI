import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { generateChatResponse } from '../services/aiService.js';
import { getWeatherByLocation } from '../services/weatherService.js';
import { fetchUSDANutrition } from '../services/usdaService.js';
import crypto from 'crypto';
import { getCachedFoods } from '../utils/foodCache.js';

// In-memory fallback chat session cache for performance
const localChatCache = new Map();

// Local basic food items fallback
const MOCK_FOODS = [
  { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
  { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fats: 5 },
  { name: 'Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
  { name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3 },
  { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.3 },
  { name: 'Salad', calories: 45, protein: 1.5, carbs: 8, fats: 0.2 },
  { name: 'Salmon', calories: 200, protein: 22, carbs: 0, fats: 13 },
  { name: 'Milk (1 glass)', calories: 120, protein: 8, carbs: 12, fats: 5 },
  { name: 'Bread (1 slice)', calories: 80, protein: 3, carbs: 15, fats: 1 }
];

const generateId = () => crypto.randomBytes(12).toString('hex');

// ── LOCAL NLP FALLBACK DATABASE ──
const LOCAL_NUTRITION_DB = {
  egg: { name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fats: 5, unit: 'piece' },
  eggs: { name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fats: 5, unit: 'piece' },
  banana: { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, unit: 'piece' },
  bananas: { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, unit: 'piece' },
  apple: { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, unit: 'piece' },
  apples: { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, unit: 'piece' },
  chicken: { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: '100g' },
  rice: { name: 'Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, unit: 'cup' },
  oatmeal: { name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3, unit: 'cup' },
  oats: { name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3, unit: 'cup' },
  salad: { name: 'Salad', calories: 45, protein: 1.5, carbs: 8, fats: 0.2, unit: 'bowl' },
  salmon: { name: 'Salmon', calories: 200, protein: 22, carbs: 0, fats: 13, unit: '100g' },
  milk: { name: 'Milk', calories: 120, protein: 8, carbs: 12, fats: 5, unit: 'glass' },
  bread: { name: 'Bread', calories: 80, protein: 3, carbs: 15, fats: 1, unit: 'slice' },
  water: { name: 'Water', calories: 0, protein: 0, carbs: 0, fats: 0, unit: 'ml', isWater: true }
};

// ── UNIFIED LOCAL-FIRST FOOD LOOKUP ──
const lookupFoodLocalOrUSDA = async (foodName) => {
  if (!foodName) return null;

  // Smart cleaning function to extract the core food name
  const getCoreFoodName = (name) => {
    if (!name) return '';
    // 1. Remove text inside parentheses (e.g. "Milk (250ml)" -> "Milk")
    let cleaned = name.replace(/\([^)]*\)/g, '');
    // 2. Remove trailing portion details after a comma or dash (e.g. "Banana, 1 medium" -> "Banana")
    cleaned = cleaned.split(/,|\s-\s/)[0];
    // 3. Remove leading quantities and common units (e.g. "2 large eggs" -> "eggs", "250ml milk" -> "milk")
    cleaned = cleaned.replace(/^\d+\s*(?:large|medium|small|g|ml|cup|glass|slice|piece|serving|tbsp|tsp|oz)?s?\s+/i, '');
    return cleaned.trim().toLowerCase();
  };

  const cleanName = getCoreFoodName(foodName);
  if (!cleanName) return null;

  // 1. Try exact match in generic LOCAL_NUTRITION_DB first
  const genericMatchKey = Object.keys(LOCAL_NUTRITION_DB).find(key => key === cleanName || LOCAL_NUTRITION_DB[key].name.toLowerCase() === cleanName);
  if (genericMatchKey) {
    const genericMatch = LOCAL_NUTRITION_DB[genericMatchKey];
    return {
      name: genericMatch.name,
      calories: genericMatch.calories,
      protein: genericMatch.protein,
      carbs: genericMatch.carbs,
      fats: genericMatch.fats
    };
  }

  try {
    const foods = await getCachedFoods();

    // 2. Exact match in local DB
    let localMatch = foods.find(food => (food.name || '').toLowerCase() === cleanName);

    // 3. Keyword match in local DB
    if (!localMatch) {
      const keywords = cleanName.split(/\s+/).filter(w => w.length > 2);

      const isWordMatch = (fw, kw) => {
        if (fw === kw) return true;
        if (fw === kw + 's' || fw + 's' === kw) return true;
        if (fw === kw + 'es' || fw + 'es' === kw) return true;
        if (kw.endsWith('y') && fw === kw.slice(0, -1) + 'ies') return true;
        if (fw.endsWith('y') && kw === fw.slice(0, -1) + 'ies') return true;
        return false;
      };

      localMatch = foods.find(food => {
        const name = (food.name || '').toLowerCase();
        const foodWords = name.split(/[^a-z0-9]+/).filter(Boolean);
        return keywords.length > 0 && keywords.every(kw => {
          return foodWords.some(fw => isWordMatch(fw, kw));
        });
      });
    }

    if (localMatch) {
      return {
        name: localMatch.name,
        calories: Number(localMatch.calories) || 0,
        protein: Number(localMatch.protein) || 0,
        carbs: Number(localMatch.carbs) || 0,
        fats: Number(localMatch.fats) || 0
      };
    }
  } catch (error) {
    console.error(`[Food Lookup] Local database lookup failed for "${foodName}":`, error.message);
  }

  try {
    const usdaItem = await fetchUSDANutrition(cleanName);
    if (usdaItem) {
      return {
        name: usdaItem.name,
        calories: usdaItem.calories,
        protein: usdaItem.protein,
        carbs: usdaItem.carbs,
        fats: usdaItem.fats
      };
    }
  } catch (error) {
    console.error(`[Food Lookup] USDA lookup failed for "${foodName}":`, error.message);
  }

  return null;
};

// ── LOCAL NLP FALLBACK PARSER ──
const parseMessageLocally = async (text) => {
  const clean = (text || '').toLowerCase().trim();
  const detectedFoods = [];
  const unmatchedFoods = [];
  let isWaterLog = false;
  let waterAmount = 250;

  const mlMatch = clean.match(/(\d+)\s*ml/);
  if (mlMatch) waterAmount = parseInt(mlMatch[1]);

  for (const key of Object.keys(LOCAL_NUTRITION_DB)) {
    if (clean.includes(key)) {
      const item = LOCAL_NUTRITION_DB[key];
      if (item.isWater) {
        isWaterLog = true;
      } else {
        if (!detectedFoods.some(f => f.name === item.name)) {
          let servings = 1;
          const numberWordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, a: 1, an: 1 };
          const pattern = new RegExp(`(?:(\\d+)|(one|two|three|four|five|an?))\\s*(?:${key}|serving|piece|cup|glass|slice|bowl|g|ml)?\\s*${key}`);
          const match = clean.match(pattern);
          if (match) {
            if (match[1]) servings = parseInt(match[1]);
            else if (match[2]) servings = numberWordMap[match[2]];
          }

          const lookedUp = await lookupFoodLocalOrUSDA(item.name);
          if (lookedUp) {
            detectedFoods.push({ ...lookedUp, servings });
          } else {
            unmatchedFoods.push(item.name);
          }
        }
      }
    }
  }

  if (detectedFoods.length === 0 && !isWaterLog) {
    const ateMatch = clean.match(/(?:ate|eating|had|logged|log)\s+([a-zA-Z\s]+)(?:for|$|\.)/);
    if (ateMatch) {
      const genericFood = ateMatch[1].replace(/(breakfast|lunch|dinner|snack|today)/g, '').trim();
      if (genericFood && genericFood.length > 2) {
        const usdaItem = await lookupFoodLocalOrUSDA(genericFood);
        if (usdaItem) {
          detectedFoods.push({ ...usdaItem, servings: 1 });
        } else {
          unmatchedFoods.push(genericFood);
        }
      }
    }
  }

  const toolCalls = [];
  let content = "I've processed your voice log.";

  if (isWaterLog) {
    toolCalls.push({
      id: `call_${generateId()}`, type: 'function',
      function: { name: 'log_water_intake', arguments: JSON.stringify({ amount_ml: waterAmount }) }
    });
    content = `[Offline Mode] I logged **${waterAmount}ml of Water** to your hydration log! 💧`;
  } else if (detectedFoods.length > 0) {
    const primary = detectedFoods[0];
    toolCalls.push({
      id: `call_${generateId()}`, type: 'function',
      function: {
        name: 'log_meal',
        arguments: JSON.stringify({
          name: primary.name,
          calories: primary.calories * primary.servings,
          protein: primary.protein * primary.servings,
          carbs: primary.carbs * primary.servings,
          fats: primary.fats * primary.servings,
          servings: primary.servings
        })
      }
    });
    const foodList = detectedFoods.map(f => `**${f.servings}x ${f.name}** (${f.calories * f.servings} kcal)`).join(', ');
    content = `[Offline Mode] I detected: ${foodList}. I successfully logged the primary item to your diary! 🍳`;
    if (unmatchedFoods.length > 0) {
      content += `\n\n*(Note: I couldn't verify the following items in the database: ${unmatchedFoods.map(f => `"${f}"`).join(', ')} so they were not logged.)*`;
    }
  } else if (unmatchedFoods.length > 0) {
    content = `[Offline Mode] I heard you say you had "${unmatchedFoods.join(', ')}", but I couldn't verify this in the database. Please try logging the individual ingredients or searching for the exact food item.`;
  } else {
    content = `[Offline Mode] I heard: "${text}". However, I couldn't identify the specific food item. Try saying something like: "I ate two eggs and a banana."`;
  }

  return { role: 'assistant', content, toolCalls };
};

// @desc    Create or get a chat session
// @route   POST /api/chat/session
const createOrGetSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id.toString();

    if (sessionId) {
      const session = await ChatSession.findById(sessionId).lean();
      if (!session || session.userId !== userId) {
        if (localChatCache.has(sessionId)) {
          return res.json({ _id: sessionId, ...localChatCache.get(sessionId) });
        }
        return res.status(404).json({ message: "Session not found" });
      }
      localChatCache.set(sessionId, session);
      return res.json({ _id: session._id, ...session });
    }

    const newSession = await ChatSession.create({
      userId,
      title: "New Conversation",
      isActive: true,
      messages: [],
    });

    const sessionObj = newSession.toObject();
    localChatCache.set(newSession._id.toString(), sessionObj);
    return res.json({ _id: newSession._id, ...sessionObj });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages for a session
// @route   GET /api/chat/session/:sessionId/messages
const getSessionMessages = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId).lean();
    if (!session || session.userId !== req.user._id.toString()) {
      if (localChatCache.has(req.params.sessionId)) {
        return res.json(localChatCache.get(req.params.sessionId).messages || []);
      }
      return res.status(404).json({ message: "Session not found" });
    }
    return res.json(session.messages || []);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Generate AI Chat Response
// @route   POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { sessionId, role, content, toolCallId, name, toolCalls, imageUrl } = req.body;
    const userId = req.user._id.toString();

    if (!sessionId) return res.status(400).json({ message: "sessionId is required." });

    let session = await ChatSession.findById(sessionId);
    let isFallback = false;

    if (!session || session.userId !== userId) {
      if (localChatCache.has(sessionId)) {
        session = localChatCache.get(sessionId);
        isFallback = true;
      } else {
        return res.status(404).json({ message: "Session not found" });
      }
    }

    if (session.isActive === false) {
      return res.status(403).json({ message: "This conversation has been closed." });
    }

    const allowedRoles = ['user', 'tool', 'assistant'];
    const messageRole = allowedRoles.includes(role) ? role : 'user';

    const incomingMessage = {
      _id: generateId(),
      role: messageRole,
      content: content || '',
      createdAt: new Date().toISOString()
    };

    if (toolCallId !== undefined) incomingMessage.toolCallId = toolCallId;
    if (name !== undefined) incomingMessage.name = name;
    if (toolCalls !== undefined) incomingMessage.toolCalls = toolCalls;
    if (imageUrl !== undefined) incomingMessage.imageUrl = imageUrl;

    let title = isFallback ? session.title : session.title;
    if (title === "New Conversation" && role === 'user') {
      const displayContent = content || 'New Image Message';
      title = displayContent.substring(0, 30) + (displayContent.length > 30 ? '...' : '');
    }

    const messages = isFallback ? (session.messages || []) : session.messages;
    const updatedMessages = [...messages, incomingMessage];

    // Format history for AI Service
    const apiMessages = updatedMessages.map(m => {
      let msgContent = m.content || "";
      if (m.imageUrl) {
        msgContent = [
          { type: "text", text: m.content || "Image uploaded" },
          { type: "image_url", image_url: { url: m.imageUrl } }
        ];
      }

      const msg = { role: m.role };
      if (m.role === 'assistant' && !msgContent) {
        msg.content = null;
      } else {
        msg.content = msgContent;
      }

      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id, type: tc.type || 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments }
        }));
      }

      if (m.role === 'tool') {
        msg.tool_call_id = m.toolCallId;
        msg.name = m.name;
      }
      return msg;
    }).filter(m => {
      if (m.role === 'assistant') return m.content || (m.tool_calls && m.tool_calls.length > 0);
      return true;
    });

    let aiResponse;
    try {
      aiResponse = await generateChatResponse(req.user, apiMessages);
    } catch (aiErr) {
      console.warn("[Chat Controller] AI Service failed, using local fallback:", aiErr.message);
      aiResponse = await parseMessageLocally(content);
    }

    let detectedToolCalls = aiResponse.toolCalls || aiResponse.tool_calls || [];
    if (detectedToolCalls.length > 1) {
      detectedToolCalls = [detectedToolCalls[0]];
      aiResponse.toolCalls = detectedToolCalls;
      aiResponse.tool_calls = detectedToolCalls;
    }

    const aiMessageDoc = {
      _id: generateId(),
      role: aiResponse.role,
      content: aiResponse.content || '',
      createdAt: new Date().toISOString()
    };

    if (detectedToolCalls.length > 0) aiMessageDoc.toolCalls = detectedToolCalls;

    updatedMessages.push(aiMessageDoc);

    // Save to MongoDB
    if (!isFallback) {
      session.messages = updatedMessages;
      session.title = title;
      session.markModified('messages');
      await session.save();
    }

    // Update local cache
    const cacheData = isFallback ? session : session.toObject();
    cacheData.messages = updatedMessages;
    cacheData.title = title;
    localChatCache.set(sessionId, cacheData);

    return res.json(aiMessageDoc);
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Execute a tool requested by the AI
// @route   POST /api/chat/execute-tool
const executeTool = async (req, res) => {
  try {
    const { toolName, sessionId, toolCallId } = req.body;
    const toolArgs = req.body.toolArgs || {};
    const userId = req.user._id.toString();

    if (!sessionId || !toolCallId) {
      return res.status(400).json({ message: "sessionId and toolCallId are required." });
    }

    let session;
    try {
      session = await ChatSession.findById(sessionId).lean();
      if (!session || session.userId !== userId) {
        if (localChatCache.has(sessionId)) {
          session = localChatCache.get(sessionId);
        } else {
          return res.status(403).json({ message: "Not authorized." });
        }
      }
    } catch (dbErr) {
      if (localChatCache.has(sessionId)) {
        session = localChatCache.get(sessionId);
      } else {
        return res.status(500).json({ message: `Database error: ${dbErr.message}` });
      }
    }

    const messages = session.messages || [];
    const aiMessage = messages.find(m => m.role === 'assistant' && m.toolCalls?.some(tc => tc.id === toolCallId));
    if (!aiMessage) return res.status(403).json({ message: "Invalid tool call." });

    const verifiedToolCall = aiMessage.toolCalls.find(tc => tc.id === toolCallId);
    if (verifiedToolCall.function.name !== toolName) {
      return res.status(403).json({ message: "Tool name mismatch." });
    }

    if (toolName === 'search_food_database') {
      const { query } = toolArgs;
      let foods = [];
      try {
        foods = await getCachedFoods();
      } catch (dbErr) {
        foods = MOCK_FOODS;
      }

      const safeQ = (query || '').trim().toLowerCase();
      if (safeQ) {
        const keywords = safeQ.split(/\s+/);
        foods = foods.filter(food => {
          const foodName = (food.name || '').toLowerCase();
          return keywords.every(word => foodName.includes(word));
        });
      }

      const top3 = foods.slice(0, 3);
      const resultString = top3.length > 0
        ? JSON.stringify(top3.map(f => ({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats })))
        : `No food items found matching '${query}'.`;

      return res.json({ result: resultString });
    }

    if (toolName === 'get_user_food_logs') {
      const { date } = toolArgs;
      let targetDate = new Date();

      if (date && typeof date === 'string') {
        const cleanDate = date.toLowerCase().trim();
        if (cleanDate === 'today') targetDate = new Date();
        else if (cleanDate === 'yesterday') { targetDate = new Date(); targetDate.setDate(targetDate.getDate() - 1); }
        else { const parsed = new Date(date); if (!isNaN(parsed.getTime())) targetDate = parsed; }
      }

      targetDate.setUTCHours(0, 0, 0, 0);
      const dateString = targetDate.toISOString();

      const log = await DailyLog.findOne({ userId, date: dateString }).lean();
      if (!log) return res.json({ result: `No food logs found for ${targetDate.toISOString().split('T')[0]}.` });

      const logData = {
        date: targetDate.toDateString(),
        foods: (log.foodItems || []).map(item => ({
          name: item.name || 'Unknown Food', servings: item.servings,
          calories: item.calories * item.servings, protein: item.protein * item.servings,
          carbs: item.carbs * item.servings, fats: item.fats * item.servings,
        })),
        totals: log.totals
      };
      return res.json({ result: JSON.stringify(logData) });
    }

    if (toolName === 'get_macro_history') {
      const { from, to } = toolArgs;
      const query = { userId };
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = new Date(from).toISOString();
        if (to) query.date.$lte = new Date(to).toISOString();
      }

      const logs = await DailyLog.find(query).lean();
      const history = logs.map(log => ({
        date: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        calories: Math.round(log.totals?.calories || 0),
        protein: Math.round(log.totals?.protein || 0),
        carbs: Math.round(log.totals?.carbs || 0),
        fats: Math.round(log.totals?.fats || 0)
      }));
      return res.json({ result: JSON.stringify(history) });
    }

    if (toolName === 'get_streak_and_achievements') {
      const user = await User.findById(req.user._id).lean();
      const streakCount = user?.streakCount || 0;
      const resultData = {
        streakCount,
        achievements: [
          { name: "First Log", description: "Logged your first meal!", unlocked: true },
          { name: "3-Day Streak", description: "Kept logging for 3 consecutive days!", unlocked: (streakCount >= 3) },
          { name: "7-Day Streak", description: "Kept logging for 7 consecutive days!", unlocked: (streakCount >= 7) }
        ]
      };
      return res.json({ result: JSON.stringify(resultData) });
    }

    if (toolName === 'log_meal') {
      const { name, calories, protein, carbs, fats, servings, date } = toolArgs;
      let finalName = name, finalCalories = calories, finalProtein = protein, finalCarbs = carbs, finalFats = fats, finalServings = servings || 1;

      const verifiedItem = await lookupFoodLocalOrUSDA(name);
      if (verifiedItem) {
        finalName = verifiedItem.name;
        
        let scaleRatio = servings || 1;
        // If servings is 1 (or default) but calories differs from database base, calculate ratio from calories
        if (scaleRatio === 1) {
          if (verifiedItem.calories > 0 && calories > 0 && Math.abs(calories - verifiedItem.calories) > 1) {
            scaleRatio = calories / verifiedItem.calories;
          } else if (verifiedItem.calories === 0) {
            // Fallback macro ratios for 0 calorie items
            if (verifiedItem.protein > 0 && protein > 0) scaleRatio = protein / verifiedItem.protein;
            else if (verifiedItem.carbs > 0 && carbs > 0) scaleRatio = carbs / verifiedItem.carbs;
            else if (verifiedItem.fats > 0 && fats > 0) scaleRatio = fats / verifiedItem.fats;
          }
        }

        // We store the BASE single-serving macros in DailyLog foodItems array, and scaleRatio as servings count,
        // so that multiplying them correctly yields the total macros without double-scaling.
        finalCalories = verifiedItem.calories;
        finalProtein = verifiedItem.protein;
        finalCarbs = verifiedItem.carbs;
        finalFats = verifiedItem.fats;
        finalServings = Number(scaleRatio.toFixed(2));
      } else {
        return res.json({ result: `Error: Could not verify '${name}' in the food database. You must log the individual ingredients or use exactly matched names from search_food_database.` });
      }

      let parsedDate = new Date();
      if (date && typeof date === 'string') {
        const cleanDate = date.toLowerCase().trim();
        if (cleanDate === 'today') parsedDate = new Date();
        else if (cleanDate === 'yesterday') { parsedDate = new Date(); parsedDate.setDate(parsedDate.getDate() - 1); }
        else { const p = new Date(date); if (!isNaN(p.getTime())) parsedDate = p; }
      }

      parsedDate.setUTCHours(0, 0, 0, 0);

      const payload = {
        date: parsedDate.toISOString(),
        foodItems: [{ name: finalName, calories: finalCalories, protein: finalProtein, carbs: finalCarbs, fats: finalFats, servings: finalServings }]
      };

      const mockReq = { body: payload, user: req.user };
      let logData = null, errorData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => { if (data.message) errorData = data; else logData = data; return mockRes; }
      };

      const { createDailyLog } = await import('./logController.js');
      await createDailyLog(mockReq, mockRes);

      if (errorData) return res.json({ result: `Failed to log meal: ${JSON.stringify(errorData)}` });
      const totalLoggedCalories = Math.round(finalCalories * finalServings);
      return res.json({ result: `Successfully logged ${finalName} (${totalLoggedCalories} kcal) to the diary for ${payload.date.split('T')[0]}.` });
    }

    if (toolName === 'get_weather_forecast') {
      const user = await User.findById(req.user._id).lean();
      const location = toolArgs.location || user?.location || 'UAE';
      const weatherData = await getWeatherByLocation(location);
      return res.json({ result: JSON.stringify(weatherData) });
    }

    if (toolName === 'search_knowledge_base') {
      const { query } = toolArgs;
      try {
        if (!process.env.PINECONE_API_KEY) {
          return res.json({ result: "Pinecone API Key is missing. Cannot search knowledge base." });
        }

        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const embedResponse = await pinecone.inference.embed({
          model: 'multilingual-e5-large',
          inputs: [query],
          parameters: { inputType: 'query', truncate: 'END' }
        });
        const queryVector = embedResponse.data[0].values;
        const index = pinecone.Index('nutriguide-kb');
        const queryResponse = await index.query({ vector: queryVector, topK: 4, includeMetadata: true });

        if (!queryResponse.matches || queryResponse.matches.length === 0) {
          return res.json({ result: "No relevant information found in the knowledge base." });
        }

        const results = queryResponse.matches.map(match => `[Source: ${match.metadata.source}]: ${match.metadata.text}`).join('\n\n');
        return res.json({ result: results });
      } catch (err) {
        console.error('Pinecone Search Error:', err);
        return res.json({ result: `Knowledge base search failed: ${err.message}` });
      }
    }

    if (toolName === 'generate_meal_plan') {
      let foods = [];
      try {
        foods = await getCachedFoods();
      } catch (dbErr) {
        foods = MOCK_FOODS;
      }

      // Select 10 random foods from the database to give the AI building blocks
      const shuffled = foods.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 15);

      const resultString = `Here are some verified healthy food ingredients from the database you can use to construct the meal plan. YOU MUST ONLY USE THESE OR EXACTLY MATCHED FOODS FROM search_food_database in your meal plan suggestion so that logging them works accurately: ${JSON.stringify(selected.map(f => ({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats })))}`;

      return res.json({ result: resultString });
    }

    // Graceful fallback for unknown tools
    console.warn(`[Execute Tool] Bypassing offline/development tool: "${toolName}"`);
    return res.json({
      result: `Tool "${toolName}" is currently offline or in mock development phase. Proceed with the conversation using general knowledge, available data, and user profile targets.`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit feedback for a message
// @route   POST /api/chat/feedback/:messageId
const submitFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
    const { messageId } = req.params;
    const userId = req.user._id.toString();

    const sessions = await ChatSession.find({ userId });

    let targetSession = null;
    let messageIndex = -1;

    for (const session of sessions) {
      const idx = (session.messages || []).findIndex(m => m._id === messageId);
      if (idx !== -1) {
        targetSession = session;
        messageIndex = idx;
        break;
      }
    }

    if (!targetSession) return res.status(404).json({ message: "Message not found" });

    targetSession.messages[messageIndex].feedback = feedback;
    targetSession.markModified('messages');
    await targetSession.save();

    res.json({ success: true, message: targetSession.messages[messageIndex] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createOrGetSession, getSessionMessages, sendMessage, executeTool, submitFeedback };
