import mongoose from 'mongoose';
import { db, auth } from '../config/firebase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Replace this with your actual MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nutri_guide';

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const dbMongo = mongoose.connection.db;

    // 1. MIGRATE USERS & GENERATE CSV FOR AUTH
    console.log('\n--- Migrating Users ---');
    const users = await dbMongo.collection('users').find({}).toArray();
    let csvContent = 'uid,email,passwordHash\n';

    const batch = db.batch();
    
    for (const user of users) {
      const uid = user._id.toString();
      
      // Add to CSV for Firebase Auth import
      if (user.password) {
        // Bcrypt hashes include the salt.
        csvContent += `${uid},${user.email},${user.password}\n`;
      }

      // Prepare Firestore Profile
      const profile = {
        email: user.email,
        role: user.role || 'user',
        age: user.age || null,
        weight: user.weight || null,
        height: user.height || null,
        healthGoals: user.healthGoals || null,
        restrictions: user.restrictions || [],
        location: user.location || null,
        pantry: user.pantry || [],
        streakCount: user.streakCount || 0,
        targetCalories: user.targetCalories || null,
        isDisabled: user.isDisabled || false,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };

      const userRef = db.collection('users').doc(uid);
      batch.set(userRef, profile);
    }

    fs.writeFileSync(path.join(__dirname, 'users.csv'), csvContent);
    console.log(`Wrote ${users.length} users to users.csv`);
    console.log('Run this command to import auth: firebase auth:import backend/scripts/users.csv --hash-algo=BCRYPT');

    // 2. MIGRATE FOOD ITEMS
    console.log('\n--- Migrating Food Items ---');
    const foods = await dbMongo.collection('fooditems').find({}).toArray();
    for (const food of foods) {
      const foodRef = db.collection('foods').doc(food._id.toString());
      const foodData = { ...food };
      delete foodData._id;
      batch.set(foodRef, foodData);
    }
    console.log(`Prepared ${foods.length} foods for migration.`);

    // 3. MIGRATE DAILY LOGS (WITH EMBEDDED FOODS)
    console.log('\n--- Migrating Daily Logs ---');
    const logs = await dbMongo.collection('dailylogs').find({}).toArray();
    for (const log of logs) {
      const logRef = db.collection('dailyLogs').doc(log._id.toString());
      
      const embeddedFoods = [];
      if (log.foodItems && Array.isArray(log.foodItems)) {
        for (const item of log.foodItems) {
          // Look up food details from memory to embed
          const foodIdStr = item.foodId?.toString();
          const foodDetails = foods.find(f => f._id.toString() === foodIdStr);
          
          if (foodDetails) {
            embeddedFoods.push({
              foodId: foodIdStr,
              name: foodDetails.name,
              calories: foodDetails.calories,
              protein: foodDetails.protein || 0,
              carbs: foodDetails.carbs || 0,
              fats: foodDetails.fats || 0,
              servings: item.servings || 1
            });
          }
        }
      }

      const logData = {
        userId: log.userId.toString(),
        date: log.date.toISOString ? log.date.toISOString() : new Date(log.date).toISOString(),
        totals: log.totals || { calories: 0, protein: 0, carbs: 0, fats: 0 },
        foodItems: embeddedFoods,
        createdAt: log.createdAt || new Date(),
        updatedAt: log.updatedAt || new Date()
      };
      
      batch.set(logRef, logData);
    }
    console.log(`Prepared ${logs.length} daily logs for migration.`);

    // 4. MIGRATE CHECK-INS
    console.log('\n--- Migrating Check-Ins ---');
    const checkIns = await dbMongo.collection('checkins').find({}).toArray();
    for (const checkIn of checkIns) {
      const ref = db.collection('checkIns').doc(checkIn._id.toString());
      const data = {
        userId: checkIn.userId.toString(),
        date: checkIn.date.toISOString ? checkIn.date.toISOString() : new Date(checkIn.date).toISOString(),
        mood: checkIn.mood,
        energyLevel: checkIn.energyLevel,
        satiety: checkIn.satiety,
        createdAt: checkIn.createdAt || new Date(),
        updatedAt: checkIn.updatedAt || new Date()
      };
      batch.set(ref, data);
    }
    console.log(`Prepared ${checkIns.length} check-ins for migration.`);

    // 5. MIGRATE CHAT SESSIONS & EMBED MESSAGES
    console.log('\n--- Migrating Chat Sessions & Messages ---');
    const sessions = await dbMongo.collection('chatsessions').find({}).toArray();
    const allMessages = await dbMongo.collection('messages').find({}).toArray();
    
    for (const session of sessions) {
      const sessionIdStr = session._id.toString();
      const sessionMessages = allMessages
        .filter(m => m.session.toString() === sessionIdStr)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(m => {
          const msgData = {
            _id: m._id.toString(),
            role: m.role,
            content: m.content || '',
            createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
          };
          if (m.toolCalls) {
            // Sanitize toolCalls to remove any MongoDB ObjectId instances inside
            msgData.toolCalls = JSON.parse(JSON.stringify(m.toolCalls));
          }
          if (m.toolCallId) msgData.toolCallId = m.toolCallId.toString();
          if (m.name) msgData.name = m.name.toString();
          if (m.imageUrl) msgData.imageUrl = m.imageUrl.toString();
          if (m.feedback) msgData.feedback = m.feedback;
          return msgData;
        });

      const ref = db.collection('chatSessions').doc(sessionIdStr);
      batch.set(ref, {
        userId: session.user.toString(),
        title: session.title,
        isActive: session.isActive,
        messages: sessionMessages,
        createdAt: session.createdAt || new Date(),
        updatedAt: session.updatedAt || new Date()
      });
    }
    console.log(`Prepared ${sessions.length} chat sessions (with embedded messages) for migration.`);

    // 6. MIGRATE MEAL PLANS
    console.log('\n--- Migrating Meal Plans ---');
    const mealPlans = await dbMongo.collection('mealplans').find({}).toArray();
    for (const plan of mealPlans) {
      // In MongoDB we had one plan per user, we will store it with userId as the doc ID
      const userIdStr = plan.user.toString();
      const ref = db.collection('mealPlans').doc(userIdStr);
      
      const planData = {
        userId: userIdStr,
        days: (plan.days || []).map(d => ({
          date: d.date.toISOString ? d.date.toISOString() : new Date(d.date).toISOString(),
          totalCalories: d.totalCalories,
          meals: d.meals ? JSON.parse(JSON.stringify(d.meals)) : { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] }
        })),
        createdAt: plan.createdAt || new Date(),
        updatedAt: plan.updatedAt || new Date()
      };
      
      batch.set(ref, planData);
    }
    console.log(`Prepared ${mealPlans.length} meal plans for migration.`);

    console.log('\nCommitting all data to Firestore...');
    await batch.commit();
    console.log('✅ Migration to Firestore completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
