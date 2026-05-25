import { db } from '../config/firebase.js';
import { searchUSDAFoods } from '../services/usdaService.js';

// @desc    Search food items
// @route   GET /api/food/search
const searchFood = async (req, res) => {
  try {
    const { q, country } = req.query;

    let queryRef = db.collection('foods');

    // Firestore doesn't support complex substring search natively.
    // If country is provided, we can filter by country at the DB level.
    if (country !== undefined) {
      if (typeof country !== 'string') {
        return res.status(400).json({ message: 'Country parameter must be a string' });
      }
      queryRef = queryRef.where('country', '==', country.trim());
    }

    const snapshot = await queryRef.get();
    let localFoods = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    // Apply regex search in memory since dataset is small.
    if (q !== undefined) {
      if (typeof q !== 'string') {
        return res.status(400).json({ message: 'Query parameter q must be a string' });
      }
      const safeQ = q.trim().toLowerCase();
      if (safeQ) {
        const keywords = safeQ.split(/\s+/);
        localFoods = localFoods.filter(food => {
          const foodName = (food.name || '').toLowerCase();
          return keywords.every(word => foodName.includes(word));
        });
      }
    }

    // ── Dynamic USDA FDC API Search Integration ──
    let usdaFoods = [];
    if (q && q.trim().length >= 2) {
      usdaFoods = await searchUSDAFoods(q.trim(), 25);
    }

    // Merge custom local foods with verified USDA database items, preventing duplicates
    const mergedFoods = [...localFoods];
    usdaFoods.forEach(usdaItem => {
      const usdaFdcId = usdaItem._id.replace('usda_', '');
      const isDuplicate = localFoods.some(local => 
        (local.fdcId && String(local.fdcId) === usdaFdcId) ||
        (local.name || '').toLowerCase() === (usdaItem.name || '').toLowerCase()
      );
      if (!isDuplicate) {
        mergedFoods.push(usdaItem);
      }
    });

    res.json(mergedFoods.slice(0, 40));
  } catch (error) {
    console.error("Search Food Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export { searchFood };
