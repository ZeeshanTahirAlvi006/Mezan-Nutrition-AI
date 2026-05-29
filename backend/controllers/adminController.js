import { db } from '../config/firebase.js';
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
      usersSnap,
      foodsSnap,
      logsSnap,
      checkInsSnap,
      sessionsSnap,
      mealPlansSnap
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('foods').get(),
      db.collection('dailyLogs').get(),
      db.collection('checkIns').get(),
      db.collection('chatSessions').get(),
      db.collection('mealPlans').get()
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const nonAdminUsers = users.filter(u => u.role !== 'admin');
    
    const newUsers7d = nonAdminUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;

    const logs = logsSnap.docs.map(d => d.data());
    const dailyLogsToday = logs.filter(l => l.date >= todayStart && l.date <= todayEnd).length;
    
    const activeUserIds = new Set(logs.filter(l => l.date >= sevenDaysAgoStr).map(l => l.userId));

    const checkIns = checkInsSnap.docs.map(d => d.data());
    const checkInsToday = checkIns.filter(c => c.date >= todayStart && c.date <= todayEnd).length;

    const sessions = sessionsSnap.docs.map(d => d.data());
    let messagesCount = 0;
    sessions.forEach(s => {
      messagesCount += (s.messages || []).length;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationsByDayObj = {};
    nonAdminUsers.forEach(u => {
      if (new Date(u.createdAt) >= thirtyDaysAgo) {
        const d = new Date(u.createdAt).toISOString().split('T')[0];
        registrationsByDayObj[d] = (registrationsByDayObj[d] || 0) + 1;
      }
    });

    const registrationsByDay = Object.keys(registrationsByDayObj).sort().map(date => ({
      date, count: registrationsByDayObj[date]
    }));

    res.json({
      totalUsers: nonAdminUsers.length,
      newUsers7d,
      activeUsers7d: activeUserIds.size,
      foodItems: foodsSnap.size,
      dailyLogsToday,
      checkInsToday,
      chatSessions: sessionsSnap.size,
      messages: messagesCount,
      mealPlans: mealPlansSnap.size,
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

    const snap = await db.collection('users').get();
    let users = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() })).filter(u => u.role !== 'admin');

    if (search) {
      users = users.filter(u => (u.email || '').toLowerCase().includes(search));
    }

    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const total = users.length;
    const paginated = users.slice(skip, skip + limit);

    res.json({ users: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] listUsers:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
};

// GET /api/admin/users/:id
const getUser = async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists || doc.data().role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = { _id: doc.id, ...doc.data() };

    const [logsSnap, sessionsSnap, planSnap] = await Promise.all([
      db.collection('dailyLogs').where('userId', '==', user._id).get(),
      db.collection('chatSessions').where('userId', '==', user._id).get(),
      db.collection('mealPlans').doc(user._id).get()
    ]);

    res.json({
      user,
      summary: {
        logCount: logsSnap.size,
        sessionCount: sessionsSnap.size,
        hasMealPlan: planSnap.exists,
        mealPlanUpdatedAt: planSnap.exists ? planSnap.data().updatedAt : null,
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
    const userRef = db.collection('users').doc(req.params.id);
    const doc = await userRef.get();
    
    if (!doc.exists || doc.data().role === 'admin') {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    if (req.body.isDisabled !== undefined) {
      if (req.body.isDisabled === true && req.params.id === req.user.uid) {
        return res.status(400).json({ message: 'Cannot disable your own account' });
      }
      updates.isDisabled = !!req.body.isDisabled;
    }

    const numericFields = ['age', 'weight', 'height'];
    numericFields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates[f] = Number(req.body[f]);
      }
    });

    if (req.body.healthGoals !== undefined) updates.healthGoals = String(req.body.healthGoals).trim();
    if (req.body.location !== undefined) updates.location = String(req.body.location).trim();
    if (req.body.restrictions !== undefined) {
      updates.restrictions = Array.isArray(req.body.restrictions) ? req.body.restrictions.map(r => String(r).trim()) : [];
    }

    updates.updatedAt = new Date();
    await userRef.update(updates);
    
    const updatedDoc = await userRef.get();
    res.json({ _id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.uid) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const userRef = db.collection('users').doc(req.params.id);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (doc.data().role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin accounts from this route' });
    }

    // Cascade delete in Firestore is manual
    const batch = db.batch();
    
    const [sessions, logs, checkIns] = await Promise.all([
      db.collection('chatSessions').where('userId', '==', req.params.id).get(),
      db.collection('dailyLogs').where('userId', '==', req.params.id).get(),
      db.collection('checkIns').where('userId', '==', req.params.id).get()
    ]);

    sessions.forEach(doc => batch.delete(doc.ref));
    logs.forEach(doc => batch.delete(doc.ref));
    checkIns.forEach(doc => batch.delete(doc.ref));
    
    batch.delete(db.collection('mealPlans').doc(req.params.id));
    batch.delete(userRef);

    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// GET /api/admin/users/:id/logs
const getUserLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const snap = await db.collection('dailyLogs').where('userId', '==', req.params.id).get();
    
    let logs = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const total = logs.length;
    const paginated = logs.slice(skip, skip + limit);

    res.json({ logs: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

// GET /api/admin/users/:id/checkins
const getUserCheckins = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const snap = await db.collection('checkIns').where('userId', '==', req.params.id).get();
    
    let checkins = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    checkins.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const total = checkins.length;
    const paginated = checkins.slice(skip, skip + limit);

    res.json({ checkins: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch check-ins' });
  }
};

// GET /api/admin/food
const listFood = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    
    let queryRef = db.collection('foods');
    if (req.query.country) {
      queryRef = queryRef.where('country', '==', String(req.query.country).trim());
    }

    const snap = await queryRef.get();
    let foods = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    if (req.query.q) {
      const search = String(req.query.q).trim().toLowerCase();
      const keywords = search.split(/\s+/);
      foods = foods.filter(f => {
        const name = (f.name || '').toLowerCase();
        return keywords.every(kw => name.includes(kw));
      });
    }

    foods.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const total = foods.length;
    const paginated = foods.slice(skip, skip + limit);

    res.json({ foods: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list food items' });
  }
};

// POST /api/admin/food
const createFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const newFood = {
      name: String(req.body.name).trim(),
      country: req.body.country || 'Global',
      calories: Number(req.body.calories),
      protein: Number(req.body.protein) || 0,
      carbs: Number(req.body.carbs) || 0,
      fats: Number(req.body.fats) || 0,
      fiber: Number(req.body.fiber) || 0,
      sugar: Number(req.body.sugar) || 0,
      sodium: Number(req.body.sodium) || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('foods').add(newFood);
    invalidateFoodCache();
    res.status(201).json({ _id: docRef.id, ...newFood });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create food item' });
  }
};

// PUT /api/admin/food/:id
const updateFood = async (req, res) => {
  try {
    const errors = validateFoodPayload(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const foodRef = db.collection('foods').doc(req.params.id);
    const doc = await foodRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'Food item not found' });

    const updates = {};
    const fields = ['name', 'country', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'name' || field === 'country'
          ? String(req.body[field]).trim()
          : Number(req.body[field]) || 0;
      }
    });

    updates.updatedAt = new Date();
    await foodRef.update(updates);
    invalidateFoodCache();
    
    const updated = await foodRef.get();
    res.json({ _id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update food item' });
  }
};

// DELETE /api/admin/food/:id
const deleteFood = async (req, res) => {
  try {
    await db.collection('foods').doc(req.params.id).delete();
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
    let imported = 0;
    
    const batch = db.batch();
    for (const food of parsed) {
      const docRef = db.collection('foods').doc();
      batch.set(docRef, { ...food, createdAt: new Date(), updatedAt: new Date() });
      imported++;
    }
    
    await batch.commit();
    invalidateFoodCache();

    res.json({ imported, skipped: req.parsedCsvRows.length - imported, errors: errors.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to import CSV' });
  }
};

// GET /api/admin/chat/sessions
const listChatSessions = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    
    let queryRef = db.collection('chatSessions');
    if (req.query.userId) {
      queryRef = queryRef.where('userId', '==', req.query.userId);
    }

    const snap = await queryRef.get();
    let sessions = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const total = sessions.length;
    const paginated = sessions.slice(skip, skip + limit);

    res.json({ sessions: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list chat sessions' });
  }
};

// GET /api/admin/chat/sessions/:sessionId/messages
const getChatMessages = async (req, res) => {
  try {
    const doc = await db.collection('chatSessions').doc(req.params.sessionId).get();
    if (!doc.exists) return res.status(404).json({ message: 'Session not found' });
    
    const session = { _id: doc.id, ...doc.data() };
    res.json({ session, messages: session.messages || [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// PATCH /api/admin/chat/sessions/:sessionId
const updateChatSession = async (req, res) => {
  try {
    const sessionRef = db.collection('chatSessions').doc(req.params.sessionId);
    if (req.body.isActive !== undefined) {
      await sessionRef.update({ isActive: !!req.body.isActive, updatedAt: new Date() });
    }
    const doc = await sessionRef.get();
    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update session' });
  }
};

// DELETE /api/admin/chat/sessions/:sessionId
const deleteChatSession = async (req, res) => {
  try {
    await db.collection('chatSessions').doc(req.params.sessionId).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete session' });
  }
};

// DELETE /api/admin/chat/messages/:messageId
const deleteChatMessage = async (req, res) => {
  // Complex in Firestore due to embedded array. We have to find the session first.
  try {
    const sessionsSnap = await db.collection('chatSessions').get();
    let found = false;
    
    for (const doc of sessionsSnap.docs) {
      const data = doc.data();
      const newMessages = (data.messages || []).filter(m => m._id !== req.params.messageId);
      if (newMessages.length !== (data.messages || []).length) {
        await doc.ref.update({ messages: newMessages });
        found = true;
        break;
      }
    }

    if (!found) return res.status(404).json({ message: 'Message not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// GET /api/admin/meal-plans
const listMealPlans = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    
    const snap = await db.collection('mealPlans').get();
    let plans = snap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    
    if (req.query.userId) {
      plans = plans.filter(p => p.userId === req.query.userId);
    }

    plans.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    const total = plans.length;
    const paginated = plans.slice(skip, skip + limit).map(p => ({
      ...p,
      dayCount: (p.days || []).length
    }));

    res.json({ plans: paginated, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list meal plans' });
  }
};

// GET /api/admin/meal-plans/:id
const getMealPlan = async (req, res) => {
  try {
    const doc = await db.collection('mealPlans').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Meal plan not found' });
    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch meal plan' });
  }
};

// DELETE /api/admin/meal-plans/:id
const deleteMealPlan = async (req, res) => {
  try {
    await db.collection('mealPlans').doc(req.params.id).delete();
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
