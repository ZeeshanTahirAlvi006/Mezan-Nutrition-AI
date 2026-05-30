import FoodItem from '../models/FoodItem.js';
import { searchUSDAFoods } from '../services/usdaService.js';
import { getCachedFoods } from '../utils/foodCache.js';

// @desc    Search food items
// @route   GET /api/food/search
const searchFood = async (req, res) => {
  try {
    const { q, country } = req.query;

    if (country !== undefined && typeof country !== 'string') {
      return res.status(400).json({ message: 'Country parameter must be a string' });
    }
    if (q !== undefined && typeof q !== 'string') {
      return res.status(400).json({ message: 'Query parameter q must be a string' });
    }

    // Run local cached foods retrieval and USDA search concurrently
    const [allLocalFoods, usdaFoods] = await Promise.all([
      getCachedFoods(),
      q && q.trim().length >= 2 ? searchUSDAFoods(q.trim(), 25) : Promise.resolve([])
    ]);

    let localFoods = allLocalFoods;

    // Filter by country in memory
    if (country !== undefined) {
      const targetCountry = country.trim().toLowerCase();
      localFoods = localFoods.filter(food => (food.country || '').trim().toLowerCase() === targetCountry);
    }

    // Filter by query in memory
    if (q !== undefined) {
      const safeQ = q.trim().toLowerCase();
      if (safeQ) {
        const keywords = safeQ.split(/\s+/);
        localFoods = localFoods.filter(food => {
          const foodName = (food.name || '').toLowerCase();
          return keywords.every(word => foodName.includes(word));
        });
      }
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
