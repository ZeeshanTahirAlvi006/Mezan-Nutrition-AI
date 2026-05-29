import { db } from '../config/firebase.js';
import { validateDailyLog } from '../models/DailyLog.js';
import { recalculateStreak } from '../utils/streak.js';
import { getCachedFoods } from '../utils/foodCache.js';

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
    // Normalize date to midnight ISO string for consistent querying
    parsedDate.setHours(0, 0, 0, 0);
    const dateString = parsedDate.toISOString();

    if (!foodItems || !Array.isArray(foodItems)) {
      return res.status(400).json({ message: 'foodItems must be an array.' });
    }

    const embeddedFoodItems = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // Fetch cached foods to perform extremely fast, zero-IO in-memory lookups
    const cachedFoods = await getCachedFoods();
    const foodMap = new Map(cachedFoods.map(f => [f._id, f]));

    // Fetch food details from cache/Firestore to embed in the log
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
            servings: servings
          });

          totalCalories += (food.calories || 0) * servings;
          totalProtein += (food.protein || 0) * servings;
          totalCarbs += (food.carbs || 0) * servings;
          totalFats += (food.fats || 0) * servings;
        } else {
          // Graceful fallback if a food item is newly created and not yet in the cache
          const foodDoc = await db.collection('foods').doc(item.foodId).get();
          if (foodDoc.exists) {
            const foodData = foodDoc.data();
            const servings = Number(item.servings) || 1;
            
            embeddedFoodItems.push({
              foodId: item.foodId,
              name: foodData.name,
              calories: Number(foodData.calories) || 0,
              protein: Number(foodData.protein) || 0,
              carbs: Number(foodData.carbs) || 0,
              fats: Number(foodData.fats) || 0,
              servings: servings
            });

            totalCalories += (foodData.calories || 0) * servings;
            totalProtein += (foodData.protein || 0) * servings;
            totalCarbs += (foodData.carbs || 0) * servings;
            totalFats += (foodData.fats || 0) * servings;
          }
        }
      } else if (item.name) {
        // If the frontend already provides embedded data (e.g. from manual entry)
        const servings = Number(item.servings) || 1;
        embeddedFoodItems.push({
          foodId: null,
          name: item.name,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fats: Number(item.fats) || 0,
          servings: servings
        });
        totalCalories += (item.calories || 0) * servings;
        totalProtein += (item.protein || 0) * servings;
        totalCarbs += (item.carbs || 0) * servings;
        totalFats += (item.fats || 0) * servings;
      }
    }

    // Find if log already exists for this user and date
    const logsRef = db.collection('dailyLogs');
    const snapshot = await logsRef
      .where('userId', '==', req.user.uid)
      .where('date', '==', dateString)
      .limit(1)
      .get();

    let logRef;
    let logData;

    if (!snapshot.empty) {
      // Update existing
      const doc = snapshot.docs[0];
      logRef = doc.ref;
      const existing = doc.data();
      
      logData = {
        userId: req.user.uid,
        date: dateString,
        foodItems: [...(existing.foodItems || []), ...embeddedFoodItems],
        totals: {
          calories: (existing.totals?.calories || 0) + totalCalories,
          protein: (existing.totals?.protein || 0) + totalProtein,
          carbs: (existing.totals?.carbs || 0) + totalCarbs,
          fats: (existing.totals?.fats || 0) + totalFats
        },
        createdAt: existing.createdAt || new Date(),
        updatedAt: new Date()
      };
    } else {
      // Create new
      logRef = logsRef.doc(); // Auto-generate ID
      logData = {
        userId: req.user.uid,
        date: dateString,
        foodItems: embeddedFoodItems,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fats: totalFats
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const validatedLog = validateDailyLog(logData);
    await logRef.set(validatedLog);

    // Call recalculateStreak non-blocking/in background to optimize latency
    recalculateStreak(req.user.uid).catch(err => console.error("Streak update error:", err));

    res.status(201).json({
      _id: logRef.id,
      ...validatedLog
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    console.error('Create Daily Log Error:', error);
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
    parsedDate.setHours(0, 0, 0, 0);
    const dateString = parsedDate.toISOString();

    const snapshot = await db.collection('dailyLogs')
      .where('userId', '==', req.user.uid)
      .where('date', '==', dateString)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      res.json({
        _id: doc.id,
        ...doc.data()
      });
    } else {
      res.json({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, foodItems: [] });
    }
  } catch (error) {
    console.error('Get Daily Log Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily logs for a weekly/date range
// @route   GET /api/logs/weekly
const getWeeklyLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start = new Date();
    start.setDate(start.getDate() - 6); // default to last 7 days
    start.setHours(0, 0, 0, 0);
    
    let end = new Date();
    end.setHours(23, 59, 59, 999);
    
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        start = parsedStart;
        start.setHours(0, 0, 0, 0);
      }
    }
    
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        end = parsedEnd;
        end.setHours(23, 59, 59, 999);
      }
    }
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    
    // Fetch logs using userId only to ensure no Firestore composite indexes are required, then filter in memory.
    const snapshot = await db.collection('dailyLogs')
      .where('userId', '==', req.user.uid)
      .get();
      
    const logs = snapshot.docs
      .map(doc => ({ _id: doc.id, ...doc.data() }))
      .filter(log => log.date >= startStr && log.date <= endStr);
    
    // Sort ascending by date
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(logs);
  } catch (error) {
    console.error('Get Weekly Logs Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createDailyLog, getDailyLog, getWeeklyLogs };
