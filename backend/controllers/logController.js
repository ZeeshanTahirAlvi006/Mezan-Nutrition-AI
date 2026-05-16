import DailyLog from '../models/DailyLog.js';
import FoodItem from '../models/FoodItem.js';

// @desc    Create or update daily log
// @route   POST /api/logs/daily
const createDailyLog = async (req, res) => {
  try {
    const { date, foodItems } = req.body;

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
      date: new Date(date).setHours(0, 0, 0, 0) // Normalize date to midnight
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
        date: new Date(date).setHours(0, 0, 0, 0),
        foodItems,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fats: totalFats
        }
      });
    }

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily log by date
// @route   GET /api/logs/daily/:date
const getDailyLog = async (req, res) => {
  try {
    const date = new Date(req.params.date).setHours(0, 0, 0, 0);
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
