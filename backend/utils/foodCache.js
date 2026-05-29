import { db } from '../config/firebase.js';

let cachedFoods = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const MOCK_FOODS_FALLBACK = [
  { _id: 'mock_apple', name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, country: 'Global' },
  { _id: 'mock_chicken', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fats: 3.6, country: 'Global' },
  { _id: 'mock_egg', name: 'Egg', calories: 70, protein: 6, carbs: 0.6, fats: 5, country: 'Global' },
  { _id: 'mock_rice', name: 'Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, country: 'Global' },
  { _id: 'mock_oatmeal', name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3, country: 'Global' },
  { _id: 'mock_banana', name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, country: 'Global' },
  { _id: 'mock_salad', name: 'Salad', calories: 45, protein: 1.5, carbs: 8, fats: 0.2, country: 'Global' },
  { _id: 'mock_salmon', name: 'Salmon', calories: 200, protein: 22, carbs: 0, fats: 13, country: 'Global' },
  { _id: 'mock_milk', name: 'Milk (1 glass)', calories: 120, protein: 8, carbs: 12, fats: 5, country: 'Global' },
  { _id: 'mock_bread', name: 'Bread (1 slice)', calories: 80, protein: 3, carbs: 15, fats: 1, country: 'Global' }
];

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
    console.log('[Food Cache] Firestore query failed and no stale cache available. Using MOCK_FOODS fallback.');
    return MOCK_FOODS_FALLBACK;
  }
};

export const invalidateFoodCache = () => {
  console.log('[Food Cache] Cache invalidated!');
  cachedFoods = null;
  cacheExpiry = null;
};
