import User from '../models/User.js';
import FoodItem from '../models/FoodItem.js';
import DailyLog from '../models/DailyLog.js';
import CheckIn from '../models/CheckIn.js';
import ChatSession from '../models/ChatSession.js';
import MealPlan from '../models/MealPlan.js';
import {
  escapeRegex,
  paginate,
  parseFoodRows,
  validateFoodPayload,
} from '../utils/csvFoodParser.js';
import { Pinecone } from '@pinecone-database/pinecone';
import pdfParse from '../scripts/pdfParser.cjs';
import crypto from 'crypto';
import { invalidateFoodCache } from '../utils/foodCache.js';

// Helpers
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const todayStart = startOfToday().toISOString();
    const todayEnd = endOfToday().toISOString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const [
      totalUsersCount,
      foodsCount,
      logsCount,
      checkInsCount,
      sessionsCount,
      mealPlansCount,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      FoodItem.countDocuments(),
      DailyLog.countDocuments(),
      CheckIn.countDocuments(),
      ChatSession.countDocuments(),
      MealPlan.countDocuments(),
    ]);

    const newUsers7d = await User.countDocuments({
      role: { $ne: 'admin' },
      createdAt: { $gte: sevenDaysAgo },
    });

    const dailyLogsToday = await DailyLog.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
    });

    const checkInsToday = await CheckIn.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
    });

    // Active users in last 7 days
    const activeLogs = await DailyLog.distinct('userId', {
      date: { $gte: sevenDaysAgoStr },
    });

    // Total messages count
    const sessions = await ChatSession.find({}, 'messages').lean();
    let messagesCount = 0;
    sessions.forEach(s => { messagesCount += (s.messages || []).length; });

    // Registration trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.find({
      role: { $ne: 'admin' },
      createdAt: { $gte: thirtyDaysAgo },
    }, 'createdAt').lean();

    const registrationsByDayObj = {};
    recentUsers.forEach(u => {
      const d = new Date(u.createdAt).toISOString().split('T')[0];
      registrationsByDayObj[d] = (registrationsByDayObj[d] || 0) + 1;
    });

    const registrationsByDay = Object.keys(registrationsByDayObj).sort().map(date => ({
      date, count: registrationsByDayObj[date]
    }));

    res.json({
      totalUsers: totalUsersCount,
      newUsers7d,
      activeUsers7d: activeLogs.length,
      foodItems: foodsCount,
      dailyLogsToday,
      checkInsToday,
      chatSessions: sessionsCount,
      messages: messagesCount,
      mealPlans: mealPlansCount,
      registrationsByDay
    });
  } catch (error) {
    console.error('[Admin] getStats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// GET /api/admin/users
const listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';

    const filter = { role: { $ne: 'admin' } };
    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listUsers:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

// GET /api/admin/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user._id.toString();
    const [logCount, sessionCount, mealPlan] = await Promise.all([
      DailyLog.countDocuments({ userId }),
      ChatSession.countDocuments({ userId }),
      MealPlan.findOne({ userId }).lean(),
    ]);

    res.json({
      user: { _id: user._id, ...user },
      summary: {
        logCount,
        sessionCount,
        hasMealPlan: !!mealPlan,
        mealPlanUpdatedAt: mealPlan?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('[Admin] getUser:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

// PATCH /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.isDisabled !== undefined) {
      if (req.body.isDisabled === true && req.params.id === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot disable your own account' });
      }
      user.isDisabled = !!req.body.isDisabled;
    }

    const numericFields = ['age', 'weight', 'height'];
    numericFields.forEach(f => {
      if (req.body[f] !== undefined) user[f] = Number(req.body[f]);
    });

    if (req.body.healthGoals !== undefined) user.healthGoals = String(req.body.healthGoals).trim();
    if (req.body.location !== undefined) user.location = String(req.body.location).trim();
    if (req.body.restrictions !== undefined) {
      user.restrictions = Array.isArray(req.body.restrictions) ? req.body.restrictions.map(r => String(r).trim()) : [];
    }

    const updatedUser = await user.save();
    const { password, ...userData } = updatedUser.toObject();
    res.json({ _id: userData._id, ...userData });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin accounts from this route' });

    // Cascade delete all user data
    await Promise.all([
      ChatSession.deleteMany({ userId }),
      DailyLog.deleteMany({ userId }),
      CheckIn.deleteMany({ userId }),
      MealPlan.deleteOne({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// GET /api/admin/users/:id/logs
const getUserLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const total = await DailyLog.countDocuments({ userId: req.params.id });
    const logs = await DailyLog.find({ userId: req.params.id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

// GET /api/admin/users/:id/checkins
const getUserCheckins = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const total = await CheckIn.countDocuments({ userId: req.params.id });
    const checkins = await CheckIn.find({ userId: req.params.id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ checkins, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch check-ins' });
  }
};

// GET /api/admin/food
const listFood = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);

    const filter = {};
    if (req.query.country) filter.country = String(req.query.country).trim();

    if (req.query.q) {
      const search = String(req.query.q).trim().toLowerCase();
      const keywords = search.split(/\s+/);
      filter.name = { $regex: keywords.map(k => `(?=.*${escapeRegex(k)})`).join(''), $options: 'i' };
    }

    const total = await FoodItem.countDocuments(filter);
    const foods = await FoodItem.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ foods: foods.map(f => ({ _id: f._id, ...f })), total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list food items' });
  }
};

// POST /api/admin/food
const createFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const newFood = await FoodItem.create({
      name: String(req.body.name).trim(),
      country: req.body.country || 'Global',
      calories: Number(req.body.calories),
      protein: Number(req.body.protein) || 0,
      carbs: Number(req.body.carbs) || 0,
      fats: Number(req.body.fats) || 0,
      fiber: Number(req.body.fiber) || 0,
      sugar: Number(req.body.sugar) || 0,
      sodium: Number(req.body.sodium) || 0,
    });

    invalidateFoodCache();
    res.status(201).json({ _id: newFood._id, ...newFood.toObject() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create food item' });
  }
};

// PUT /api/admin/food/:id
const updateFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const food = await FoodItem.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Food item not found' });

    const fields = ['name', 'country', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        food[field] = field === 'name' || field === 'country'
          ? String(req.body[field]).trim()
          : Number(req.body[field]) || 0;
      }
    });

    const updated = await food.save();
    invalidateFoodCache();
    res.json({ _id: updated._id, ...updated.toObject() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update food item' });
  }
};

// DELETE /api/admin/food/:id
const deleteFood = async (req, res) => {
  try {
    await FoodItem.findByIdAndDelete(req.params.id);
    invalidateFoodCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete food item' });
  }
};

// POST /api/admin/food/import
const importFoodCsv = async (req, res) => {
  try {
    if (!req.parsedCsvRows || req.parsedCsvRows.length === 0) {
      return res.status(400).json({ message: 'No valid rows in CSV file' });
    }

    const { parsed, errors } = parseFoodRows(req.parsedCsvRows);
    const foodDocs = parsed.map(food => ({
      ...food,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await FoodItem.insertMany(foodDocs, { ordered: false });
    invalidateFoodCache();

    res.json({ imported: result.length, skipped: req.parsedCsvRows.length - result.length, errors: errors.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to import CSV' });
  }
};

// GET /api/admin/chat/sessions
const listChatSessions = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;

    const total = await ChatSession.countDocuments(filter);
    const sessions = await ChatSession.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ sessions: sessions.map(s => ({ _id: s._id, ...s })), total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list chat sessions' });
  }
};

// GET /api/admin/chat/sessions/:sessionId/messages
const getChatMessages = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ session: { _id: session._id, ...session }, messages: session.messages || [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// PATCH /api/admin/chat/sessions/:sessionId
const updateChatSession = async (req, res) => {
  try {
    const updates = {};
    if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;

    const session = await ChatSession.findByIdAndUpdate(
      req.params.sessionId,
      { $set: updates },
      { new: true }
    ).lean();

    res.json({ _id: session._id, ...session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update session' });
  }
};

// DELETE /api/admin/chat/sessions/:sessionId
const deleteChatSession = async (req, res) => {
  try {
    await ChatSession.findByIdAndDelete(req.params.sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete session' });
  }
};

// DELETE /api/admin/chat/messages/:messageId
const deleteChatMessage = async (req, res) => {
  try {
    const result = await ChatSession.findOneAndUpdate(
      { 'messages._id': req.params.messageId },
      { $pull: { messages: { _id: req.params.messageId } } },
      { new: true }
    );

    if (!result) return res.status(404).json({ message: 'Message not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// GET /api/admin/meal-plans
const listMealPlans = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;

    const total = await MealPlan.countDocuments(filter);
    const plans = await MealPlan.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      plans: plans.map(p => ({ ...p, _id: p._id, dayCount: (p.days || []).length })),
      total, page, limit, pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list meal plans' });
  }
};

// GET /api/admin/meal-plans/:id
const getMealPlan = async (req, res) => {
  try {
    const plan = await MealPlan.findById(req.params.id).lean();
    if (!plan) return res.status(404).json({ message: 'Meal plan not found' });
    res.json({ _id: plan._id, ...plan });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch meal plan' });
  }
};

// DELETE /api/admin/meal-plans/:id
const deleteMealPlan = async (req, res) => {
  try {
    await MealPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete meal plan' });
  }
};

// POST /api/admin/knowledge-base/upload
const uploadPdfKnowledgeBase = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required (field name: file)' });
    }

    const dataBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    const data = await pdfParse(dataBuffer);
    const rawText = data.text;
    const cleanText = rawText.replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      return res.status(400).json({ message: 'No extractable text found in the PDF.' });
    }

    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    const chunks = [];
    let startIndex = 0;
    while (startIndex < cleanText.length) {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, cleanText.length);
      chunks.push(cleanText.substring(startIndex, endIndex));
      startIndex += CHUNK_SIZE - OVERLAP;
    }

    if (!process.env.PINECONE_API_KEY) {
      return res.status(500).json({ message: 'Pinecone API key is not configured.' });
    }
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.Index('nutriguide-kb');

    let vectors = [];
    let uploaded = 0;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const EMBED_BATCH = 10;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      try {
        const batchTexts = chunks.slice(i, i + EMBED_BATCH);
        const embedResponse = await pinecone.inference.embed({
          model: 'multilingual-e5-large',
          inputs: batchTexts,
          parameters: { inputType: 'passage', truncate: 'END' }
        });
        const embeddings = embedResponse.data.map(d => d.values);

        for (let j = 0; j < embeddings.length; j++) {
          vectors.push({
            id: `vec_${crypto.randomBytes(16).toString('hex')}`,
            values: embeddings[j],
            metadata: { source: fileName, text: batchTexts[j] }
          });
        }

        if (vectors.length >= 50 || i + EMBED_BATCH >= chunks.length) {
          if (vectors.length > 0) {
            await index.upsert({ records: vectors });
            uploaded += vectors.length;
            vectors = [];
          }
          await delay(500);
        }
      } catch (err) {
        console.error('Error generating/uploading chunk:', err.message);
      }
    }

    res.json({ message: 'PDF successfully processed and uploaded to Knowledge Base', chunks: uploaded });
  } catch (error) {
    console.error('[Admin] uploadPdfKnowledgeBase:', error);
    res.status(500).json({ message: 'Failed to process PDF' });
  }
};

export {
  getStats,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserLogs,
  getUserCheckins,
  listFood,
  createFood,
  updateFood,
  deleteFood,
  importFoodCsv,
  listChatSessions,
  getChatMessages,
  updateChatSession,
  deleteChatSession,
  deleteChatMessage,
  listMealPlans,
  getMealPlan,
  deleteMealPlan,
  uploadPdfKnowledgeBase,
};
