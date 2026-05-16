import FoodItem from '../models/FoodItem.js';

// @desc    Search food items
// @route   GET /api/food/search
const searchFood = async (req, res) => {
  try {
    const { q, country } = req.query;

    const query = {};
    if (q) {
      const safeQ = String(q).trim();
      const keywords = safeQ.split(/\s+/);
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      query.$and = keywords.map(word => ({
        name: { $regex: escapeRegex(word), $options: 'i' }
      }));
    }
    if (country) {
      query.country = country;
    }

    const foods = await FoodItem.find(query).limit(50);
    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { searchFood };
