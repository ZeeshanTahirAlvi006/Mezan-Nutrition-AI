/**
 * Migrate ALL data from Firebase Firestore to MongoDB.
 * 
 * CRITICAL: Run this script BEFORE removing the firebase-admin package!
 *           It reads from Firestore and writes to MongoDB.
 * 
 * Usage: node scripts/migrateFirebaseToMongo.js
 * 
 * This script:
 * 1. Connects to both Firestore and MongoDB
 * 2. Exports all collections (foods, users, dailyLogs, checkIns, chatSessions, mealPlans)
 * 3. Saves a local JSON backup of all food data for safety
 * 4. Inserts into MongoDB collections
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Dynamic import of firebase — only needed for migration
let db;
try {
  const firebase = await import('../config/firebase.js');
  db = firebase.db;
} catch (err) {
  console.error('❌ Cannot import Firebase config. Make sure firebase-admin is still installed.');
  console.error('   This script must be run BEFORE removing the firebase-admin package.');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

const migrate = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' FIRESTORE → MONGODB DATA MIGRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Connect to MongoDB
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');
    const mongoDB = mongoose.connection.db;

    // ─── 1. MIGRATE FOODS (MOST CRITICAL) ───
    console.log('\n📦 MIGRATING FOODS...');
    const foodsSnap = await db.collection('foods').get();
    const foods = foodsSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${foods.length} food items in Firestore.`);

    // Save local JSON backup for safety
    const backupPath = join(__dirname, 'food_data_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(foods, null, 2), 'utf8');
    console.log(`   💾 Saved food data backup to: ${backupPath}`);

    if (foods.length > 0) {
      const foodDocs = foods.map(f => ({
        name: f.name,
        country: f.country || 'Global',
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fats: Number(f.fats) || 0,
        fiber: Number(f.fiber) || 0,
        sugar: Number(f.sugar) || 0,
        sodium: Number(f.sodium) || 0,
        fdcId: f.fdcId || null,
        usdaOfficialName: f.usdaOfficialName || null,
        verifiedWithUSDA: f.verifiedWithUSDA || false,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
        updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
      }));

      await mongoDB.collection('fooditems').deleteMany({});
      const result = await mongoDB.collection('fooditems').insertMany(foodDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} food items into MongoDB.`);
    }

    // ─── 2. MIGRATE USERS ───
    console.log('\n👤 MIGRATING USERS...');
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${users.length} users in Firestore.`);

    if (users.length > 0) {
      const userDocs = users.map(u => ({
        firebaseUid: u.firestoreId,
        email: u.email,
        name: u.name || u.email?.split('@')[0] || 'User',
        role: u.role || 'user',
        age: u.age || null,
        weight: u.weight || null,
        height: u.height || null,
        healthGoals: u.healthGoals || 'Maintenance',
        restrictions: u.restrictions || [],
        location: u.location || 'UAE',
        pantry: u.pantry || [],
        streakCount: u.streakCount || 0,
        targetCalories: u.targetCalories || 2000,
        isDisabled: u.isDisabled || false,
        // Note: Password will need to be set separately — Firebase Auth doesn't expose passwords
        password: '$2a$10$placeholder_hash_please_reset',
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
      }));

      await mongoDB.collection('users').deleteMany({});
      const result = await mongoDB.collection('users').insertMany(userDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} users into MongoDB.`);
      console.log('   ⚠️  NOTE: Users will need to reset their passwords (Firebase Auth hashes are not exportable).');
    }

    // ─── 3. MIGRATE DAILY LOGS ───
    console.log('\n📊 MIGRATING DAILY LOGS...');
    const logsSnap = await db.collection('dailyLogs').get();
    const logs = logsSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${logs.length} daily logs in Firestore.`);

    if (logs.length > 0) {
      const logDocs = logs.map(l => ({
        userId: l.userId,
        date: l.date,
        foodItems: (l.foodItems || []).map(fi => ({
          foodId: fi.foodId || null,
          name: fi.name || 'Unknown',
          calories: Number(fi.calories) || 0,
          protein: Number(fi.protein) || 0,
          carbs: Number(fi.carbs) || 0,
          fats: Number(fi.fats) || 0,
          servings: Number(fi.servings) || 1,
        })),
        totals: {
          calories: Number(l.totals?.calories) || 0,
          protein: Number(l.totals?.protein) || 0,
          carbs: Number(l.totals?.carbs) || 0,
          fats: Number(l.totals?.fats) || 0,
        },
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
        updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
      }));

      await mongoDB.collection('dailylogs').deleteMany({});
      const result = await mongoDB.collection('dailylogs').insertMany(logDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} daily logs into MongoDB.`);
    }

    // ─── 4. MIGRATE CHECK-INS ───
    console.log('\n✅ MIGRATING CHECK-INS...');
    const checkInsSnap = await db.collection('checkIns').get();
    const checkIns = checkInsSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${checkIns.length} check-ins in Firestore.`);

    if (checkIns.length > 0) {
      const checkInDocs = checkIns.map(c => ({
        userId: c.userId,
        date: c.date,
        mood: c.mood,
        energyLevel: c.energyLevel,
        satiety: c.satiety,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      }));

      await mongoDB.collection('checkins').deleteMany({});
      const result = await mongoDB.collection('checkins').insertMany(checkInDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} check-ins into MongoDB.`);
    }

    // ─── 5. MIGRATE CHAT SESSIONS (with embedded messages) ───
    console.log('\n💬 MIGRATING CHAT SESSIONS...');
    const sessionsSnap = await db.collection('chatSessions').get();
    const sessions = sessionsSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${sessions.length} chat sessions in Firestore.`);

    if (sessions.length > 0) {
      const sessionDocs = sessions.map(s => ({
        userId: s.userId,
        title: s.title || 'Chat Session',
        isActive: s.isActive !== false,
        messages: (s.messages || []).map(m => ({
          _id: m._id,
          role: m.role,
          content: m.content || '',
          toolCalls: m.toolCalls || undefined,
          toolCallId: m.toolCallId || undefined,
          name: m.name || undefined,
          feedback: m.feedback || undefined,
          imageUrl: m.imageUrl || undefined,
          createdAt: m.createdAt || new Date().toISOString(),
        })),
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      }));

      await mongoDB.collection('chatsessions').deleteMany({});
      const result = await mongoDB.collection('chatsessions').insertMany(sessionDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} chat sessions into MongoDB.`);
    }

    // ─── 6. MIGRATE MEAL PLANS ───
    console.log('\n🍽️ MIGRATING MEAL PLANS...');
    const mealPlansSnap = await db.collection('mealPlans').get();
    const mealPlans = mealPlansSnap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    console.log(`   Found ${mealPlans.length} meal plans in Firestore.`);

    if (mealPlans.length > 0) {
      const mealPlanDocs = mealPlans.map(p => ({
        userId: p.userId || p.firestoreId,
        days: (p.days || []).map(d => ({
          date: d.date,
          totalCalories: Number(d.totalCalories) || 0,
          meals: d.meals || { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] },
        })),
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      }));

      await mongoDB.collection('mealplans').deleteMany({});
      const result = await mongoDB.collection('mealplans').insertMany(mealPlanDocs);
      console.log(`   ✅ Inserted ${result.insertedCount} meal plans into MongoDB.`);
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' ✅ MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Foods:         ${foods.length}`);
    console.log(`  Users:         ${users.length}`);
    console.log(`  Daily Logs:    ${logs.length}`);
    console.log(`  Check-Ins:     ${checkIns.length}`);
    console.log(`  Chat Sessions: ${sessions.length}`);
    console.log(`  Meal Plans:    ${mealPlans.length}`);
    console.log(`\n  📁 Food data backup: ${backupPath}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  }
};

migrate();
