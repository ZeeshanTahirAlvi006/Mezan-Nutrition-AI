import { db } from '../config/firebase.js';

let cachedFoods = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedFoods = async () => {
  const now = Date.now();
  if (cachedFoods && cacheExpiry && now < cacheExpiry) {
    console.log('[Food Cache] Cache hit!');
    return cachedFoods;
  }

  console.log('[Food Cache] Cache miss! Fetching from Firestore...');
  try {
    const snapshot = await db.collection('foods').get();
    cachedFoods = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    cacheExpiry = now + CACHE_TTL;
    return cachedFoods;
  } catch (error) {
    console.error('[Food Cache] Failed to fetch foods from Firestore:', error.message);
    if (cachedFoods) {
      console.log('[Food Cache] Returning stale cache due to Firestore error');
      return cachedFoods;
    }
    throw error;
  }
};

export const invalidateFoodCache = () => {
  console.log('[Food Cache] Cache invalidated!');
  cachedFoods = null;
  cacheExpiry = null;
};
