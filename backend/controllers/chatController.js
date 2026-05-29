import { db } from '../config/firebase.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { generateChatResponse } from '../services/aiService.js';
import { getWeatherByLocation } from '../services/weatherService.js';
import { fetchUSDANutrition } from '../services/usdaService.js';
import crypto from 'crypto';
import { getCachedFoods } from '../utils/foodCache.js';

// In-memory fallback chat session cache for zero-downtime during Firestore quota exhaustion
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

// Helper to generate unique IDs for messages
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
// Searches our Firestore database first, then falls back to USDA FDC API
const lookupFoodLocalOrUSDA = async (foodName) => {
  if (!foodName) return null;
  const cleanName = foodName.trim().toLowerCase();
  
  // Step 1: Search local Firestore foods collection
  try {
    const foods = await getCachedFoods();
    
    // Try exact name match first
    let localMatch = foods.find(food => {
      const name = (food.name || '').toLowerCase();
      return name === cleanName;
    });
    
    // If no exact match, try substring/keyword match
    if (!localMatch) {
      const keywords = cleanName.split(/\s+/).filter(w => w.length > 2);
      localMatch = foods.find(food => {
        const name = (food.name || '').toLowerCase();
        return keywords.length > 0 && keywords.every(kw => name.includes(kw));
      });
    }
    
    // If still no match, try partial inclusion
    if (!localMatch) {
      localMatch = foods.find(food => {
        const name = (food.name || '').toLowerCase();
        return name.includes(cleanName) || cleanName.includes(name.split(' ')[0]);
      });
    }
    
    if (localMatch) {
      console.log(`[Food Lookup] ✅ Found LOCAL database match for "${foodName}": "${localMatch.name}"`);
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
  
  // Step 2: Fallback to USDA FDC API
  console.log(`[Food Lookup] No local match for "${foodName}". Querying USDA FDC API...`);
  try {
    const usdaItem = await fetchUSDANutrition(foodName);
    if (usdaItem) {
      console.log(`[Food Lookup] ✅ Found USDA match for "${foodName}": "${usdaItem.name}"`);
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
  
  // Try to find matching food items
  const detectedFoods = [];
  let isWaterLog = false;
  let waterAmount = 250; // default

  // Check for water volume keywords
  const mlMatch = clean.match(/(\d+)\s*ml/);
  if (mlMatch) {
    waterAmount = parseInt(mlMatch[1]);
  }

  // Look for keywords in the text
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
            if (match[1]) {
              servings = parseInt(match[1]);
            } else if (match[2]) {
              servings = numberWordMap[match[2]];
            }
          }
          
          // Query local Firestore DB first, then USDA as fallback
          const lookedUp = await lookupFoodLocalOrUSDA(item.name);

          if (lookedUp) {
            detectedFoods.push({
              name: lookedUp.name,
              calories: lookedUp.calories,
              protein: lookedUp.protein,
              carbs: lookedUp.carbs,
              fats: lookedUp.fats,
              servings
            });
          } else {
            detectedFoods.push({ ...item, servings });
          }
        }
      }
    }
  }

  // If no known food detected, but they said "ate [something]"
  if (detectedFoods.length === 0 && !isWaterLog) {
    const ateMatch = clean.match(/(?:ate|eating|had|logged|log)\s+([a-zA-Z\s]+)(?:for|$|\.)/);
    if (ateMatch) {
      const genericFood = ateMatch[1].replace(/(breakfast|lunch|dinner|snack|today)/g, '').trim();
      if (genericFood && genericFood.length > 2) {
        // Query local Firestore DB first, then USDA as fallback
        const usdaItem = await lookupFoodLocalOrUSDA(genericFood);

        if (usdaItem) {
          detectedFoods.push({
            name: usdaItem.name,
            calories: usdaItem.calories,
            protein: usdaItem.protein,
            carbs: usdaItem.carbs,
            fats: usdaItem.fats,
            servings: 1
          });
        } else {
          detectedFoods.push({
            name: genericFood.charAt(0).toUpperCase() + genericFood.slice(1),
            calories: 250,
            protein: 15,
            carbs: 30,
            fats: 8,
            servings: 1
          });
        }
      }
    }
  }

  const toolCalls = [];
  let content = "I've processed your voice log.";

  if (isWaterLog) {
    toolCalls.push({
      id: `call_${generateId()}`,
      type: 'function',
      function: {
        name: 'log_water_intake',
        arguments: JSON.stringify({ amount_ml: waterAmount })
      }
    });
    content = `[Offline Mode] I logged **${waterAmount}ml of Water** to your hydration log! 💧`;
  } else if (detectedFoods.length > 0) {
    const primary = detectedFoods[0];
    toolCalls.push({
      id: `call_${generateId()}`,
      type: 'function',
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
  } else {
    content = `[Offline Mode] I heard: "${text}". However, I couldn't identify the specific food item. Try saying something like: "I ate two eggs and a banana."`;
  }

  return {
    role: 'assistant',
    content,
    toolCalls
  };
};

// @desc    Create or get a chat session
// @route   POST /api/chat/session
const createOrGetSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    let sessionData;
    let actualSessionId;

    if (sessionId) {
      try {
        const docRef = db.collection('chatSessions').doc(sessionId);
        const docSnap = await docRef.get();

        if (!docSnap.exists || docSnap.data().userId !== req.user.uid) {
          if (localChatCache.has(sessionId)) {
            sessionData = localChatCache.get(sessionId);
            actualSessionId = sessionId;
          } else {
            return res.status(404).json({ message: "Session not found" });
          }
        } else {
          sessionData = docSnap.data();
          actualSessionId = docSnap.id;
          localChatCache.set(actualSessionId, sessionData);
        }
      } catch (dbErr) {
        console.error("Firestore error in createOrGetSession (fetch):", dbErr.message);
        if (localChatCache.has(sessionId)) {
          sessionData = localChatCache.get(sessionId);
          actualSessionId = sessionId;
        } else {
          sessionData = {
            userId: req.user.uid,
            title: "Temporary Conversation",
            isActive: true,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          actualSessionId = sessionId;
          localChatCache.set(actualSessionId, sessionData);
        }
      }
    } else {
      const newSession = {
        userId: req.user.uid,
        title: "New Conversation",
        isActive: true,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        const docRef = await db.collection('chatSessions').add(newSession);
        sessionData = newSession;
        actualSessionId = docRef.id;
        localChatCache.set(actualSessionId, sessionData);
      } catch (dbErr) {
        console.error("Firestore error in createOrGetSession (add):", dbErr.message);
        actualSessionId = `temp_${crypto.randomBytes(8).toString('hex')}`;
        sessionData = newSession;
        localChatCache.set(actualSessionId, sessionData);
      }
    }

    return res.json({ _id: actualSessionId, ...sessionData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages for a session
// @route   GET /api/chat/session/:sessionId/messages
const getSessionMessages = async (req, res) => {
  try {
    try {
      const docRef = db.collection('chatSessions').doc(req.params.sessionId);
      const docSnap = await docRef.get();

      if (!docSnap.exists || docSnap.data().userId !== req.user.uid) {
        if (localChatCache.has(req.params.sessionId)) {
          const cachedSession = localChatCache.get(req.params.sessionId);
          return res.json(cachedSession.messages || []);
        }
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = docSnap.data().messages || [];
      return res.json(messages);
    } catch (dbErr) {
      console.error("Firestore error in getSessionMessages:", dbErr.message);
      if (localChatCache.has(req.params.sessionId)) {
        const cachedSession = localChatCache.get(req.params.sessionId);
        return res.json(cachedSession.messages || []);
      }
      return res.json([]);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
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

    let session;
    let sessionRef = null;
    let isFallback = false;

    try {
      sessionRef = db.collection('chatSessions').doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists || sessionSnap.data().userId !== req.user.uid) {
        if (localChatCache.has(sessionId)) {
          session = localChatCache.get(sessionId);
          isFallback = true;
        } else {
          return res.status(404).json({ message: "Session not found" });
        }
      } else {
        session = sessionSnap.data();
      }
    } catch (dbErr) {
      console.error("Firestore error in sendMessage (session load):", dbErr.message);
      if (localChatCache.has(sessionId)) {
        session = localChatCache.get(sessionId);
        isFallback = true;
      } else {
        session = {
          userId: req.user.uid,
          title: "Temporary Conversation",
          isActive: true,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        isFallback = true;
        localChatCache.set(sessionId, session);
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

    let title = session.title;
    if (session.title === "New Conversation" && role === 'user') {
      const displayContent = content || 'New Image Message';
      title = displayContent.substring(0, 30) + (displayContent.length > 30 ? '...' : '');
    }

    const updatedMessages = [...(session.messages || []), incomingMessage];

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
        msg.content = null; // Standardize empty assistant messages to null
      } else {
        msg.content = msgContent;
      }

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
      if (m.role === 'assistant') {
        return m.content || (m.tool_calls && m.tool_calls.length > 0);
      }
      return true;
    });

    let aiResponse;
    try {
      aiResponse = await generateChatResponse(req.user, apiMessages);
    } catch (aiErr) {
      console.warn("[Chat Controller] AI Service key validation failed, initiating local fallback NLP parser:", aiErr.message);
      aiResponse = await parseMessageLocally(content);
    }

    let detectedToolCalls = aiResponse.toolCalls || aiResponse.tool_calls || [];

    // TRUNCATE to 1 tool call because our frontend loop only handles 1 at a time.
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

    if (detectedToolCalls.length > 0) {
      aiMessageDoc.toolCalls = detectedToolCalls;
    }

    updatedMessages.push(aiMessageDoc);

    // Save session to local memory cache
    session.messages = updatedMessages;
    session.title = title;
    session.updatedAt = new Date();
    localChatCache.set(sessionId, session);

    // Non-blocking/graceful update to Firestore
    if (!isFallback && sessionRef) {
      const messagesToSave = updatedMessages.map(m => {
        const { imageUrl, ...rest } = m;
        return rest;
      });

      try {
        await sessionRef.update({
          title,
          messages: messagesToSave,
          updatedAt: new Date()
        });
      } catch (saveErr) {
        console.error("Firestore background update failed (kept in local cache):", saveErr.message);
      }
    }

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

    if (!sessionId || !toolCallId) {
      return res.status(400).json({ message: "sessionId and toolCallId are required." });
    }

    let session;
    try {
      const sessionSnap = await db.collection('chatSessions').doc(sessionId).get();
      if (!sessionSnap.exists || sessionSnap.data().userId !== req.user.uid) {
        if (localChatCache.has(sessionId)) {
          session = localChatCache.get(sessionId);
        } else {
          return res.status(403).json({ message: "Not authorized." });
        }
      } else {
        session = sessionSnap.data();
      }
    } catch (dbErr) {
      console.error("Firestore error in executeTool (session load):", dbErr.message);
      if (localChatCache.has(sessionId)) {
        session = localChatCache.get(sessionId);
      } else {
        return res.status(500).json({ message: `Database error: ${dbErr.message}` });
      }
    }

    const messages = session.messages || [];

    const aiMessage = messages.find(m => m.role === 'assistant' && m.toolCalls?.some(tc => tc.id === toolCallId));
    if (!aiMessage) {
      return res.status(403).json({ message: "Invalid tool call." });
    }

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
        console.error("Firestore error in search_food_database (using local fallback):", dbErr.message);
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

      let resultString = '';
      if (top3.length > 0) {
        resultString = JSON.stringify(top3.map(f => ({
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
      let targetDate = new Date();

      if (date && typeof date === 'string') {
        const cleanDate = date.toLowerCase().trim();
        if (cleanDate === 'today') {
          targetDate = new Date();
        } else if (cleanDate === 'yesterday') {
          targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - 1);
        } else {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            targetDate = parsed;
          }
        }
      }

      targetDate.setHours(0, 0, 0, 0);
      const dateString = targetDate.toISOString();

      try {
        const logSnap = await db.collection('dailyLogs')
          .where('userId', '==', req.user.uid)
          .where('date', '==', dateString)
          .limit(1)
          .get();

        if (logSnap.empty) {
          return res.json({ result: `No food logs found for ${targetDate.toDateString()}.` });
        }

        const log = logSnap.docs[0].data();

        const logData = {
          date: targetDate.toDateString(),
          foods: (log.foodItems || []).map(item => ({
            name: item.name || 'Unknown Food',
            servings: item.servings,
            calories: item.calories * item.servings,
            protein: item.protein * item.servings,
            carbs: item.carbs * item.servings,
            fats: item.fats * item.servings,
          })),
          totals: log.totals
        };

        return res.json({ result: JSON.stringify(logData) });
      } catch (dbErr) {
        console.error("Firestore error in get_user_food_logs:", dbErr.message);
        return res.json({ result: `Could not retrieve food logs for ${targetDate.toDateString()} due to a temporary database quota or network limit.` });
      }
    }

    if (toolName === 'get_macro_history') {
      const { from, to } = toolArgs;
      try {
        const logsSnap = await db.collection('dailyLogs')
          .where('userId', '==', req.user.uid)
          .get();
        
        let logs = logsSnap.docs.map(doc => doc.data());
        
        if (from || to) {
          const fromTime = from ? new Date(from).setHours(0, 0, 0, 0) : 0;
          const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : Infinity;
          logs = logs.filter(log => {
            const d = new Date(log.date).getTime();
            return d >= fromTime && d <= toTime;
          });
        }
        
        const history = logs.map(log => ({
          date: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          calories: Math.round(log.totals?.calories || 0),
          protein: Math.round(log.totals?.protein || 0),
          carbs: Math.round(log.totals?.carbs || 0),
          fats: Math.round(log.totals?.fats || 0)
        }));
        
        return res.json({ result: JSON.stringify(history) });
      } catch (dbErr) {
        console.error("Firestore error in get_macro_history:", dbErr.message);
        return res.json({ result: "[]" });
      }
    }

    if (toolName === 'get_streak_and_achievements') {
      try {
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const streakCount = userData.streakCount || 0;
        
        const resultData = {
          streakCount,
          achievements: [
            { name: "First Log", description: "Logged your first meal!", unlocked: true },
            { name: "3-Day Streak", description: "Kept logging for 3 consecutive days!", unlocked: (streakCount >= 3) },
            { name: "7-Day Streak", description: "Kept logging for 7 consecutive days!", unlocked: (streakCount >= 7) }
          ]
        };
        return res.json({ result: JSON.stringify(resultData) });
      } catch (dbErr) {
        console.error("Firestore error in get_streak_and_achievements:", dbErr.message);
        return res.json({ result: JSON.stringify({ streakCount: 0, achievements: [] }) });
      }
    }

    if (toolName === 'log_meal') {
      const { name, calories, protein, carbs, fats, date } = toolArgs;
      
      let finalName = name;
      let finalCalories = calories;
      let finalProtein = protein;
      let finalCarbs = carbs;
      let finalFats = fats;
      
      // Cross-verify with local Firestore DB first, then USDA as fallback
      const verifiedItem = await lookupFoodLocalOrUSDA(name);

      if (verifiedItem) {
        console.log(`[Execute Tool] Cross-verified "${name}" with:`, verifiedItem.name);
        finalName = verifiedItem.name;
        finalCalories = verifiedItem.calories;
        finalProtein = verifiedItem.protein;
        finalCarbs = verifiedItem.carbs;
        finalFats = verifiedItem.fats;
      }

      let parsedDate = new Date();
      if (date && typeof date === 'string') {
        const cleanDate = date.toLowerCase().trim();
        if (cleanDate === 'today') {
          parsedDate = new Date();
        } else if (cleanDate === 'yesterday') {
          parsedDate = new Date();
          parsedDate.setDate(parsedDate.getDate() - 1);
        } else {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            parsedDate = parsed;
          }
        }
      }

      const payload = {
        date: parsedDate.toISOString(),
        foodItems: [{ name: finalName, calories: finalCalories, protein: finalProtein, carbs: finalCarbs, fats: finalFats, servings: 1 }]
      };

      const mockReq = { body: payload, user: req.user };
      let logData = null;
      let errorData = null;
      const mockRes = {
        status: () => mockRes,
        json: (data) => {
          if (data.message) {
            errorData = data;
          } else {
            logData = data;
          }
          return mockRes;
        }
      };

      // Import createDailyLog dynamically to prevent circular dependencies if they ever occur
      const { createDailyLog } = await import('./logController.js');
      await createDailyLog(mockReq, mockRes);

      if (errorData) {
        return res.json({ result: `Failed to log meal: ${JSON.stringify(errorData)}` });
      }
      return res.json({ result: `Successfully logged ${name} (${calories} kcal) to the diary for ${payload.date}.` });
    }

    if (toolName === 'get_weather_forecast') {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const location = toolArgs.location || (userDoc.exists ? userDoc.data().location : 'UAE') || 'UAE';
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

        // Use Pinecone's built-in embedding
        const embedResponse = await pinecone.inference.embed({
          model: 'multilingual-e5-large',
          inputs: [query],
          parameters: { inputType: 'query', truncate: 'END' }
        });
        const queryVector = embedResponse.data[0].values;

        const index = pinecone.Index('nutriguide-kb');

        const queryResponse = await index.query({
          vector: queryVector,
          topK: 4,
          includeMetadata: true
        });

        if (!queryResponse.matches || queryResponse.matches.length === 0) {
          return res.json({ result: "No relevant information found in the knowledge base." });
        }

        const results = queryResponse.matches.map(match => {
          return `[Source: ${match.metadata.source}]: ${match.metadata.text}`;
        }).join('\n\n');

        return res.json({ result: results });
      } catch (err) {
        console.error('Pinecone Search Error:', err);
        return res.json({ result: `Knowledge base search failed: ${err.message}` });
      }
    }

    // Graceful fallback for newly declared or offline development tools
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

    // We must find which session this message belongs to.
    // In Firestore, if messages are embedded, we have to query sessions where messages array contains an object with _id = messageId
    // Alternatively, we require frontend to pass sessionId. The legacy route doesn't.
    // Let's do a broad search since chatSessions is relatively small per user.
    const sessionsSnap = await db.collection('chatSessions').where('userId', '==', req.user.uid).get();

    let targetSessionRef = null;
    let targetSessionData = null;
    let messageIndex = -1;

    for (const doc of sessionsSnap.docs) {
      const data = doc.data();
      const idx = (data.messages || []).findIndex(m => m._id === messageId);
      if (idx !== -1) {
        targetSessionRef = doc.ref;
        targetSessionData = data;
        messageIndex = idx;
        break;
      }
    }

    if (!targetSessionRef) {
      return res.status(404).json({ message: "Message not found" });
    }

    targetSessionData.messages[messageIndex].feedback = feedback;
    await targetSessionRef.update({ messages: targetSessionData.messages });

    res.json({ success: true, message: targetSessionData.messages[messageIndex] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createOrGetSession, getSessionMessages, sendMessage, executeTool, submitFeedback };
