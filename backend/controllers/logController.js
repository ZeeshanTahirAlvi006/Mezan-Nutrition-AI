import { db } from '../config/firebase.js';
import { validateDailyLog } from '../models/DailyLog.js';
import { recalculateStreak } from '../utils/streak.js';
import { getCachedFoods } from '../utils/foodCache.js';
import { connectMongoDB, MongoDailyLog } from '../utils/mongodbFallback.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_FILE = path.join(__dirname, '../data/logs_fallback.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dir = path.dirname(BACKUP_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Read backup logs from persistent local disk
const readBackupLogs = () => {
  try {
    ensureDataDir();
    if (fs.existsSync(BACKUP_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    }
  } catch (err) {
    console.error("[Backup System] Failed to read backup logs:", err.message);
  }
  return {};
};

// Write a log to local disk backup
const writeBackupLog = (key, logData) => {
  try {
    ensureDataDir();
    const data = readBackupLogs();
    data[key] = logData;
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[Backup System] Saved log persistently to disk fallback: ${key}`);
  } catch (err) {
    console.error("[Backup System] Failed to write backup log to disk:", err.message);
  }
};

// Background syncer to migrate offline disk and MongoDB logs back to Firestore once quota resets
const syncBackupToFirestore = async () => {
  try {
    const data = readBackupLogs();
    const keys = Object.keys(data);
    
    // 1. Sync from local disk file
    let syncedCount = 0;
    for (const key of keys) {
      const log = data[key];
      if (log.isOfflineFallback || !log.syncedToCloud) {
        const [userId, dateString] = key.split('_');
        const logsRef = db.collection('dailyLogs');
        const snapshot = await logsRef
          .where('userId', '==', userId)
          .where('date', '==', dateString)
          .limit(1)
          .get();

        let logRef;
        if (!snapshot.empty) {
          logRef = snapshot.docs[0].ref;
        } else {
          logRef = logsRef.doc();
        }

        const cleanLog = { ...log };
        delete cleanLog.isOfflineFallback;
        cleanLog.syncedToCloud = true;

        await logRef.set(cleanLog);

        // Update local file representation
        data[key] = cleanLog;
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Backup System] Successfully synced ${syncedCount} offline logs from local disk to Firestore!`);
    }

    // 2. Sync from MongoDB Atlas backup (if available)
    try {
      const mongoConnected = await connectMongoDB();
      if (mongoConnected) {
        const unsyncedMongoLogs = await MongoDailyLog.find({ syncedToCloud: { $ne: true } });
        if (unsyncedMongoLogs.length > 0) {
          console.log(`[Backup System] Found ${unsyncedMongoLogs.length} unsynced logs in MongoDB Atlas. Syncing...`);
          for (const mLog of unsyncedMongoLogs) {
            const logsRef = db.collection('dailyLogs');
            const snapshot = await logsRef
              .where('userId', '==', mLog.userId)
              .where('date', '==', mLog.date)
              .limit(1)
              .get();

            let logRef;
            if (!snapshot.empty) {
              logRef = snapshot.docs[0].ref;
            } else {
              logRef = logsRef.doc();
            }

            const cloudLog = mLog.toObject();
            delete cloudLog._id;
            delete cloudLog.__v;
            delete cloudLog.key;
            cloudLog.syncedToCloud = true;

            await logRef.set(cloudLog);
            
            mLog.syncedToCloud = true;
            await mLog.save();
          }
          console.log(`[Backup System] Successfully synced MongoDB fallback logs to Firestore!`);
        }
      }
    } catch (mErr) {
      console.warn("[Backup System] Background MongoDB cloud sync deferred:", mErr.message);
    }

  } catch (err) {
    console.warn(`[Backup System] Background sync postponed (Firestore still exhausted):`, err.message);
  }
};

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
          try {
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
          } catch (dbErr) {
            console.warn("[Log Controller] Failed to load food doc details under offline mode, skipping details");
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

    // Determine current existing log (either from Firestore, MongoDB, or disk fallback)
    let existingLog = null;
    const backupKey = `${req.user.uid}_${dateString}`;
    const backupLogs = readBackupLogs();

    try {
      const logsRef = db.collection('dailyLogs');
      const snapshot = await logsRef
        .where('userId', '==', req.user.uid)
        .where('date', '==', dateString)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        existingLog = snapshot.docs[0].data();
      }
    } catch (dbErr) {
      console.warn("[Log Controller] Firestore query failed. Trying MongoDB fallback...");
      try {
        const mongoConnected = await connectMongoDB();
        if (mongoConnected) {
          const mongoLog = await MongoDailyLog.findOne({ key: backupKey });
          if (mongoLog) {
            existingLog = mongoLog.toObject();
          }
        }
      } catch (mongoErr) {
        console.warn("[Log Controller] MongoDB fallback failed too. Trying disk fallback...");
      }

      if (!existingLog) {
        existingLog = backupLogs[backupKey] || null;
      }
    }

    let logData;
    if (existingLog) {
      logData = {
        userId: req.user.uid,
        date: dateString,
        foodItems: [...(existingLog.foodItems || []), ...embeddedFoodItems],
        totals: {
          calories: (existingLog.totals?.calories || 0) + totalCalories,
          protein: (existingLog.totals?.protein || 0) + totalProtein,
          carbs: (existingLog.totals?.carbs || 0) + totalCarbs,
          fats: (existingLog.totals?.fats || 0) + totalFats
        },
        createdAt: existingLog.createdAt || new Date(),
        updatedAt: new Date(),
        syncedToCloud: false
      };
    } else {
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
        updatedAt: new Date(),
        syncedToCloud: false
      };
    }

    const validatedLog = validateDailyLog(logData);

    // Save to persistent disk backup immediately to ensure zero-data-loss!
    writeBackupLog(backupKey, { ...validatedLog, isOfflineFallback: true });

    // Non-blocking background streak update
    recalculateStreak(req.user.uid).catch(() => {});

    // Try storing to Firestore
    try {
      const logsRef = db.collection('dailyLogs');
      const snapshot = await db.collection('dailyLogs')
        .where('userId', '==', req.user.uid)
        .where('date', '==', dateString)
        .limit(1)
        .get();

      let logRef;
      if (!snapshot.empty) {
        logRef = snapshot.docs[0].ref;
      } else {
        logRef = logsRef.doc();
      }

      const cloudLog = { ...validatedLog, syncedToCloud: true };
      await logRef.set(cloudLog);
      
      // Update disk backup to mark as synced to cloud
      writeBackupLog(backupKey, cloudLog);

      // Trigger asynchronous background sync for any older offline files
      syncBackupToFirestore().catch(() => {});

      return res.status(201).json({
        _id: logRef.id,
        ...cloudLog
      });
    } catch (firestoreError) {
      console.warn(`[Log Controller] Firestore quota exceeded. Trying MongoDB Atlas fallback...`, firestoreError.message);
      
      try {
        const mongoConnected = await connectMongoDB();
        if (mongoConnected) {
          const mongoLog = await MongoDailyLog.findOneAndUpdate(
            { key: backupKey },
            { ...validatedLog, key: backupKey, syncedToCloud: false },
            { upsert: true, new: true }
          );
          console.log("[Log Controller] Successfully saved log to MongoDB Atlas fallback!");
          return res.status(201).json({
            _id: `mongo_${mongoLog._id}`,
            ...validatedLog,
            isOfflineFallback: true,
            isMongoFallback: true
          });
        }
      } catch (mongoErr) {
        console.error("[Log Controller] MongoDB Atlas fallback failed too:", mongoErr.message);
      }

      // Return 201 Created successfully with the disk copy!
      return res.status(201).json({
        _id: `temp_${backupKey}`,
        ...validatedLog,
        isOfflineFallback: true
      });
    }
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    console.error('Create Daily Log Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily log by date
// @route   GET /api/logs/daily/:date
const getDailyLog = async (req, res) => {
  const parsedDate = new Date(req.params.date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format.' });
  }
  parsedDate.setHours(0, 0, 0, 0);
  const dateString = parsedDate.toISOString();
  const backupKey = `${req.user.uid}_${dateString}`;

  try {
    const snapshot = await db.collection('dailyLogs')
      .where('userId', '==', req.user.uid)
      .where('date', '==', dateString)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const logData = { _id: doc.id, ...doc.data() };
      
      // Sync to local disk backup
      writeBackupLog(backupKey, { ...logData, syncedToCloud: true });
      
      // Trigger background sync for other entries
      syncBackupToFirestore().catch(() => {});

      return res.json(logData);
    } else {
      // Try MongoDB fallback
      try {
        const mongoConnected = await connectMongoDB();
        if (mongoConnected) {
          const mongoLog = await MongoDailyLog.findOne({ key: backupKey });
          if (mongoLog) {
            return res.json(mongoLog.toObject());
          }
        }
      } catch (mongoErr) {
        console.warn("[Log Controller] MongoDB read failed:", mongoErr.message);
      }

      // Check local disk backup
      const backupLogs = readBackupLogs();
      if (backupLogs[backupKey]) {
        return res.json(backupLogs[backupKey]);
      }
      return res.json({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, foodItems: [] });
    }
  } catch (error) {
    console.warn('[Log Controller] Firestore quota exceeded. Trying MongoDB fallback...', error.message);
    
    try {
      const mongoConnected = await connectMongoDB();
      if (mongoConnected) {
        const mongoLog = await MongoDailyLog.findOne({ key: backupKey });
        if (mongoLog) {
          return res.json(mongoLog.toObject());
        }
      }
    } catch (mongoErr) {
      console.warn("[Log Controller] MongoDB fallback read failed:", mongoErr.message);
    }

    const backupLogs = readBackupLogs();
    if (backupLogs[backupKey]) {
      return res.json(backupLogs[backupKey]);
    }
    res.json({ totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, foodItems: [] });
  }
};

// @desc    Get daily logs for a weekly/date range
// @route   GET /api/logs/weekly
const getWeeklyLogs = async (req, res) => {
  let start = new Date();
  start.setDate(start.getDate() - 6); // default to last 7 days
  start.setHours(0, 0, 0, 0);
  
  let end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const { startDate, endDate } = req.query;
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

  try {
    // Fetch logs using userId only to ensure no Firestore composite indexes are required, then filter in memory.
    const snapshot = await db.collection('dailyLogs')
      .where('userId', '==', req.user.uid)
      .get();
      
    const logs = snapshot.docs
      .map(doc => ({ _id: doc.id, ...doc.data() }))
      .filter(log => log.date >= startStr && log.date <= endStr);
    
    // Sync to local disk backup
    logs.forEach(log => {
      writeBackupLog(`${req.user.uid}_${log.date}`, { ...log, syncedToCloud: true });
    });

    // Trigger background sync for other entries
    syncBackupToFirestore().catch(() => {});

    // Sort ascending by date
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(logs);
  } catch (error) {
    console.warn('[Log Controller] Firestore quota exceeded. Trying MongoDB fallback...', error.message);
    
    try {
      const mongoConnected = await connectMongoDB();
      if (mongoConnected) {
        const mongoLogs = await MongoDailyLog.find({
          userId: req.user.uid,
          date: { $gte: startStr, $lte: endStr }
        });
        
        if (mongoLogs.length > 0) {
          const logs = mongoLogs.map(l => l.toObject());
          logs.sort((a, b) => new Date(a.date) - new Date(b.date));
          return res.json(logs);
        }
      }
    } catch (mongoErr) {
      console.warn("[Log Controller] MongoDB weekly read failed:", mongoErr.message);
    }

    const backupLogs = readBackupLogs();
    const logs = [];
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString();
      const backupKey = `${req.user.uid}_${dateStr}`;
      
      if (backupLogs[backupKey]) {
        logs.push(backupLogs[backupKey]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(logs);
  }
};

export { createDailyLog, getDailyLog, getWeeklyLogs };
