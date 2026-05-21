import DailyLog from '../models/DailyLog.js';
import FoodItem from '../models/FoodItem.js';
import { recalculateStreak } from '../utils/streak.js';

// @desc    Create or update daily log
// @route   POST /api/logs/daily
const createDailyLog = async (req, res) => {
  try {
    const { date, foodItems } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required.' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    const normalizedDate = parsedDate.setHours(0, 0, 0, 0);

    if (!foodItems || !Array.isArray(foodItems)) {
      return res.status(400).json({ message: 'foodItems must be an array.' });
    }

    // Calculate totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    for (const item of foodItems) {
      const food = await FoodItem.findById(item.foodId);
      if (food) {
        totalCalories += food.calories * item.servings;
        totalProtein += (food.protein || 0) * item.servings;
        totalCarbs += (food.carbs || 0) * item.servings;
        totalFats += (food.fats || 0) * item.servings;
      }
    }

    // Find if log already exists for this user and date
    let log = await DailyLog.findOne({
      userId: req.user._id,
      date: normalizedDate
    });

    if (log) {
      // Update existing
      log.foodItems = [...log.foodItems, ...foodItems];
      log.totals.calories += totalCalories;
      log.totals.protein += totalProtein;
      log.totals.carbs += totalCarbs;
      log.totals.fats += totalFats;
      await log.save();
    } else {
      // Create new
      log = await DailyLog.create({
        userId: req.user._id,
        date: normalizedDate,
        foodItems,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fats: totalFats
        }
      });
    }

    await recalculateStreak(req.user._id);

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily log by date
// @route   GET /api/logs/daily/:date
const getDailyLog = async (req, res) => {
  try {
    const parsedDate = new Date(req.params.date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    const date = parsedDate.setHours(0, 0, 0, 0);

    const log = await DailyLog.findOne({
      userId: req.user._id,
      date: date
    }).populate('foodItems.foodId');

    if (log) {
      res.json(log);
    } else {
      res.json({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, foodItems: [] });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createDailyLog, getDailyLog };
