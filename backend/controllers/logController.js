import DailyLog from '../models/DailyLog.js';
import { recalculateStreak } from '../utils/streak.js';
import { getCachedFoods } from '../utils/foodCache.js';
import { resolveTimezone, getNormalizedLocalDate } from '../utils/dateUtils.js';

// @desc    Create or update daily log
// @route   POST /api/logs/daily
const createDailyLog = async (req, res) => {
  try {
    const { date, foodItems } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required.' });
    }
    const timezone = resolveTimezone(req, req.user);
    const parsedDate = getNormalizedLocalDate(date, timezone);
    const dateString = parsedDate.toISOString();

    if (!foodItems || !Array.isArray(foodItems)) {
      return res.status(400).json({ message: 'foodItems must be an array.' });
    }

    const embeddedFoodItems = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // Fetch cached foods for fast in-memory lookups
    const cachedFoods = await getCachedFoods();
    const foodMap = new Map(cachedFoods.map(f => [f._id.toString(), f]));

    for (const item of foodItems) {
      if (item.foodId) {
        const food = foodMap.get(item.foodId);
        if (food) {
          const servings = Number(item.servings) || 1;
          embeddedFoodItems.push({
            foodId: item.foodId,
            name: food.name,
            calories: Number(food.calories) || 0,
            protein: Number(food.protein) || 0,
            carbs: Number(food.carbs) || 0,
            fats: Number(food.fats) || 0,
            servings,
          });
          totalCalories += (food.calories || 0) * servings;
          totalProtein += (food.protein || 0) * servings;
          totalCarbs += (food.carbs || 0) * servings;
          totalFats += (food.fats || 0) * servings;
        } else if (item.name) {
          // Fallback for USDA foods or missing local foods
          const servings = Number(item.servings) || 1;
          embeddedFoodItems.push({
            foodId: item.foodId,
            name: item.name,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0,
            servings,
          });
          totalCalories += (item.calories || 0) * servings;
          totalProtein += (item.protein || 0) * servings;
          totalCarbs += (item.carbs || 0) * servings;
          totalFats += (item.fats || 0) * servings;
        }
      } else if (item.name) {
        const servings = Number(item.servings) || 1;
        embeddedFoodItems.push({
          foodId: null,
          name: item.name,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fats: Number(item.fats) || 0,
          servings,
        });
        totalCalories += (item.calories || 0) * servings;
        totalProtein += (item.protein || 0) * servings;
        totalCarbs += (item.carbs || 0) * servings;
        totalFats += (item.fats || 0) * servings;
      }
    }

    const userId = req.user._id.toString();

    // Find existing log for this user+date
    const existingLog = await DailyLog.findOne({ userId, date: dateString });

    let savedLog;
    if (existingLog) {
      existingLog.foodItems.push(...embeddedFoodItems);
      existingLog.totals.calories += totalCalories;
      existingLog.totals.protein += totalProtein;
      existingLog.totals.carbs += totalCarbs;
      existingLog.totals.fats += totalFats;
      savedLog = await existingLog.save();
    } else {
      savedLog = await DailyLog.create({
        userId,
        date: dateString,
        foodItems: embeddedFoodItems,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fats: totalFats,
        },
      });
    }

    // Non-blocking background streak update
    recalculateStreak(userId).catch(() => {});

    res.status(201).json({
      _id: savedLog._id,
      ...savedLog.toObject(),
    });
  } catch (error) {
    console.error('Create Daily Log Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily log by date
// @route   GET /api/logs/daily/:date
const getDailyLog = async (req, res) => {
  try {
    const timezone = resolveTimezone(req, req.user);
    const parsedDate = getNormalizedLocalDate(req.params.date, timezone);
    const dateString = parsedDate.toISOString();
    const userId = req.user._id.toString();

    const log = await DailyLog.findOne({ userId, date: dateString }).lean();

    if (log) {
      return res.json({ _id: log._id, ...log });
    }

    res.json({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, foodItems: [] });
  } catch (error) {
    console.error('Get Daily Log Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily logs for a weekly/date range
// @route   GET /api/logs/weekly
const getWeeklyLogs = async (req, res) => {
  try {
    const timezone = resolveTimezone(req, req.user);
    
    // Default to the last 7 days in the user's timezone
    let start = getNormalizedLocalDate('today', timezone);
    start.setUTCDate(start.getUTCDate() - 6);
    
    let end = getNormalizedLocalDate('today', timezone);
    // Include the full day by ending at 23:59:59.999 UTC
    end.setUTCHours(23, 59, 59, 999);

    const { startDate, endDate } = req.query;
    if (startDate) {
      start = getNormalizedLocalDate(startDate, timezone);
    }
    if (endDate) {
      end = getNormalizedLocalDate(endDate, timezone);
      end.setUTCHours(23, 59, 59, 999);
    }

    const startStr = start.toISOString();
    const endStr = end.toISOString();
    const userId = req.user._id.toString();

    const logs = await DailyLog.find({
      userId,
      date: { $gte: startStr, $lte: endStr },
    }).sort({ date: 1 }).lean();

    res.json(logs.map(log => ({ _id: log._id, ...log })));
  } catch (error) {
    console.error('Get Weekly Logs Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createDailyLog, getDailyLog, getWeeklyLogs };
