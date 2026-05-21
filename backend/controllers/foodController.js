import FoodItem from '../models/FoodItem.js';

// @desc    Search food items
// @route   GET /api/food/search
const searchFood = async (req, res) => {
  try {
    const { q, country } = req.query;

    const query = {};
    if (q !== undefined) {
      if (typeof q !== 'string') {
        return res.status(400).json({ message: 'Query parameter q must be a string' });
      }
      const safeQ = q.trim();
      if (safeQ) {
        const keywords = safeQ.split(/\s+/);
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        query.$and = keywords.map(word => ({
          name: { $regex: escapeRegex(word), $options: 'i' }
        }));
      }
    }
    if (country !== undefined) {
      if (typeof country !== 'string') {
        return res.status(400).json({ message: 'Country parameter must be a string' });
      }
      query.country = country.trim();
    }

    const foods = await FoodItem.find(query).limit(50);
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { searchFood };
