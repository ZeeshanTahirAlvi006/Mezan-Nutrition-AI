import User from '../models/User.js';
import FoodItem from '../models/FoodItem.js';
import DailyLog from '../models/DailyLog.js';
import CheckIn from '../models/CheckIn.js';
import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import MealPlan from '../models/MealPlan.js';
import {
  escapeRegex,
  paginate,
  parseFoodRows,
  validateFoodPayload,
} from '../utils/csvFoodParser.js';

// Accounts without `role` (pre-migration) are regular users, not admins
const nonAdminFilter = { role: { $ne: 'admin' } };

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

const countAdmins = () => User.countDocuments({ role: 'admin', isDisabled: { $ne: true } });

const cascadeDeleteUser = async (userId) => {
  const sessions = await ChatSession.find({ user: userId }).select('_id');
  const sessionIds = sessions.map((s) => s._id);

  await Message.deleteMany({ session: { $in: sessionIds } });
  await ChatSession.deleteMany({ user: userId });
  await DailyLog.deleteMany({ userId });
  await CheckIn.deleteMany({ userId });
  await MealPlan.deleteMany({ user: userId });
  await User.findByIdAndDelete(userId);
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      newUsers7d,
      foodItems,
      dailyLogsToday,
      checkInsToday,
      chatSessions,
      messages,
      mealPlans,
      activeUserIds,
    ] = await Promise.all([
      User.countDocuments(nonAdminFilter),
      User.countDocuments({ ...nonAdminFilter, createdAt: { $gte: sevenDaysAgo } }),
      FoodItem.countDocuments(),
      DailyLog.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } }),
      CheckIn.countDocuments({ date: { $gte: todayStart, $lte: todayEnd } }),
      ChatSession.countDocuments(),
      Message.countDocuments(),
      MealPlan.countDocuments(),
      DailyLog.distinct('userId', { date: { $gte: sevenDaysAgo } }),
    ]);

    const registrations = await User.aggregate([
      { $match: { ...nonAdminFilter, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      newUsers7d,
      activeUsers7d: activeUserIds.length,
      foodItems,
      dailyLogsToday,
      checkInsToday,
      chatSessions,
      messages,
      mealPlans,
      registrationsByDay: registrations.map((r) => ({ date: r._id, count: r.count })),
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
    const search = req.query.search ? String(req.query.search).trim() : '';

    const filter = { ...nonAdminFilter };
    if (search) {
      filter.email = { $regex: escapeRegex(search), $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listUsers:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

// GET /api/admin/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    const [logCount, sessionCount, mealPlan] = await Promise.all([
      DailyLog.countDocuments({ userId: user._id }),
      ChatSession.countDocuments({ user: user._id }),
      MealPlan.findOne({ user: user._id }).select('_id updatedAt'),
    ]);

    res.json({
      user,
      summary: {
        logCount,
        sessionCount,
        hasMealPlan: !!mealPlan,
        mealPlanUpdatedAt: mealPlan?.updatedAt,
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
    const target = await User.findById(req.params.id);
    if (!target || target.role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.isDisabled !== undefined) {
      if (req.body.isDisabled === true && target._id.equals(req.user._id)) {
        return res.status(400).json({ message: 'Cannot disable your own account' });
      }
      target.isDisabled = !!req.body.isDisabled;
    }

    if (req.body.age !== undefined) {
      const age = Number(req.body.age);
      if (isNaN(age) || age < 1 || age > 120 || !Number.isInteger(age)) {
        return res.status(400).json({ message: 'Age must be an integer between 1 and 120' });
      }
      target.age = age;
    }

    if (req.body.weight !== undefined) {
      const weight = Number(req.body.weight);
      if (isNaN(weight) || weight <= 0 || weight > 500) {
        return res.status(400).json({ message: 'Weight must be a positive number up to 500' });
      }
      target.weight = weight;
    }

    if (req.body.height !== undefined) {
      const height = Number(req.body.height);
      if (isNaN(height) || height <= 0 || height > 300) {
        return res.status(400).json({ message: 'Height must be a positive number up to 300' });
      }
      target.height = height;
    }

    if (req.body.healthGoals !== undefined) {
      target.healthGoals = String(req.body.healthGoals).trim() || target.healthGoals;
    }

    if (req.body.restrictions !== undefined) {
      if (!Array.isArray(req.body.restrictions)) {
        return res.status(400).json({ message: 'Restrictions must be an array' });
      }
      target.restrictions = req.body.restrictions.map(r => String(r).trim());
    }

    if (req.body.location !== undefined) {
      target.location = String(req.body.location).trim();
    }

    await target.save();
    const user = await User.findById(target._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('[Admin] updateUser:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (target.role === 'admin') {
      const admins = await countAdmins();
      if (admins <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
    }

    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    console.log(`[Admin] User deleted by ${req.user.email}: ${target.email}`);
    await cascadeDeleteUser(target._id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] deleteUser:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// GET /api/admin/users/:id/logs
const getUserLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { userId: req.params.id };

    const [logs, total] = await Promise.all([
      DailyLog.find(filter)
        .populate('foodItems.foodId', 'name calories protein carbs fats')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      DailyLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] getUserLogs:', error);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

// GET /api/admin/users/:id/checkins
const getUserCheckins = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { userId: req.params.id };

    const [checkins, total] = await Promise.all([
      CheckIn.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      CheckIn.countDocuments(filter),
    ]);

    res.json({ checkins, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] getUserCheckins:', error);
    res.status(500).json({ message: 'Failed to fetch check-ins' });
  }
};

// GET /api/admin/food
const listFood = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const query = {};

    if (req.query.q) {
      const safeQ = String(req.query.q).trim();
      const keywords = safeQ.split(/\s+/);
      query.$and = keywords.map((word) => ({
        name: { $regex: escapeRegex(word), $options: 'i' },
      }));
    }
    if (req.query.country) {
      query.country = String(req.query.country).trim();
    }

    const [foods, total] = await Promise.all([
      FoodItem.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      FoodItem.countDocuments(query),
    ]);

    res.json({ foods, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listFood:', error);
    res.status(500).json({ message: 'Failed to list food items' });
  }
};

// POST /api/admin/food
const createFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const food = await FoodItem.create({
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

    res.status(201).json(food);
  } catch (error) {
    console.error('[Admin] createFood:', error);
    res.status(500).json({ message: 'Failed to create food item' });
  }
};

// PUT /api/admin/food/:id
const updateFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body, true);
    if (errors.length) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const food = await FoodItem.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    const fields = ['name', 'country', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        food[field] = field === 'name' || field === 'country'
          ? String(req.body[field]).trim()
          : Number(req.body[field]) || 0;
      }
    }

    await food.save();
    res.json(food);
  } catch (error) {
    console.error('[Admin] updateFood:', error);
    res.status(500).json({ message: 'Failed to update food item' });
  }
};

// DELETE /api/admin/food/:id
const deleteFood = async (req, res) => {
  try {
    const food = await FoodItem.findByIdAndDelete(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] deleteFood:', error);
    res.status(500).json({ message: 'Failed to delete food item' });
  }
};

// POST /api/admin/food/import — req.parsedCsvRows set by multer middleware
const importFoodCsv = async (req, res) => {
  try {
    if (!req.parsedCsvRows || req.parsedCsvRows.length === 0) {
      return res.status(400).json({ message: 'No valid rows in CSV file' });
    }

    const { parsed, errors } = parseFoodRows(req.parsedCsvRows);
    let imported = 0;
    let skipped = 0;

    const CHUNK = 500;
    for (let i = 0; i < parsed.length; i += CHUNK) {
      const chunk = parsed.slice(i, i + CHUNK);
      try {
        const result = await FoodItem.insertMany(chunk, { ordered: false });
        imported += result.length;
      } catch (e) {
        if (e.writeErrors) {
          imported += chunk.length - e.writeErrors.length;
          skipped += e.writeErrors.length;
        } else {
          skipped += chunk.length;
        }
      }
    }

    console.log(`[Admin] CSV import by ${req.user.email}: imported=${imported}, skipped=${skipped}`);
    res.json({ imported, skipped, errors: errors.slice(0, 50) });
  } catch (error) {
    console.error('[Admin] importFoodCsv:', error);
    res.status(500).json({ message: 'Failed to import CSV' });
  }
};

// GET /api/admin/chat/sessions
const listChatSessions = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const [sessions, total] = await Promise.all([
      ChatSession.find(filter)
        .populate('user', 'email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatSession.countDocuments(filter),
    ]);

    res.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listChatSessions:', error);
    res.status(500).json({ message: 'Failed to list chat sessions' });
  }
};

// GET /api/admin/chat/sessions/:sessionId/messages
const getChatMessages = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId).populate('user', 'email');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const messages = await Message.find({ session: session._id }).sort('createdAt');
    res.json({ session, messages });
  } catch (error) {
    console.error('[Admin] getChatMessages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// PATCH /api/admin/chat/sessions/:sessionId
const updateChatSession = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (req.body.isActive !== undefined) {
      session.isActive = !!req.body.isActive;
    }

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('[Admin] updateChatSession:', error);
    res.status(500).json({ message: 'Failed to update session' });
  }
};

// DELETE /api/admin/chat/sessions/:sessionId
const deleteChatSession = async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log(`[Admin] Session deleted by ${req.user.email}: ${session._id}`);
    await Message.deleteMany({ session: session._id });
    await session.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] deleteChatSession:', error);
    res.status(500).json({ message: 'Failed to delete session' });
  }
};

// DELETE /api/admin/chat/messages/:messageId
const deleteChatMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] deleteChatMessage:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// GET /api/admin/meal-plans
const listMealPlans = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const [plans, total] = await Promise.all([
      MealPlan.find(filter)
        .populate('user', 'email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-days.meals'),
      MealPlan.countDocuments(filter),
    ]);

    const plansWithMeta = await Promise.all(
      plans.map(async (p) => {
        const full = await MealPlan.findById(p._id).select('days');
        return {
          ...p.toObject(),
          dayCount: full?.days?.length || 0,
        };
      })
    );

    res.json({ plans: plansWithMeta, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listMealPlans:', error);
    res.status(500).json({ message: 'Failed to list meal plans' });
  }
};

// GET /api/admin/meal-plans/:id
const getMealPlan = async (req, res) => {
  try {
    const plan = await MealPlan.findById(req.params.id).populate('user', 'email');
    if (!plan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error('[Admin] getMealPlan:', error);
    res.status(500).json({ message: 'Failed to fetch meal plan' });
  }
};

// DELETE /api/admin/meal-plans/:id
const deleteMealPlan = async (req, res) => {
  try {
    const plan = await MealPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] deleteMealPlan:', error);
    res.status(500).json({ message: 'Failed to delete meal plan' });
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
};
