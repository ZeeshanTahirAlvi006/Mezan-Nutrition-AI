import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FoodItem from '../models/FoodItem.js';
import connectDB from '../config/db.js';

dotenv.config();

const cleanDatabase = async () => {
  try {
    await connectDB();
    console.log('🧹 Database Janitor starting... analyzing 13,000+ items.');

    const allFoods = await FoodItem.find({});
    const foodMap = new Map();
    const toDelete = [];

    allFoods.forEach(food => {
      const cleanName = food.name.toLowerCase().trim();
      
      // Calculate Quality Score (more fields = higher score)
      let score = 0;
      if (food.protein > 0) score += 1;
      if (food.carbs > 0) score += 1;
      if (food.fats > 0) score += 1;
      if (food.sugar > 0) score += 1;
      if (food.sodium > 0) score += 1;
      if (food.fiber > 0) score += 1;
      if (food.category && food.category !== 'Kaggle Dataset') score += 2;

      if (!foodMap.has(cleanName)) {
        foodMap.set(cleanName, { id: food._id, score, data: food });
      } else {
        const existing = foodMap.get(cleanName);
        
        // If current food is "better" than the one we already have, swap them
        if (score > existing.score) {
          toDelete.push(existing.id);
          foodMap.set(cleanName, { id: food._id, score, data: food });
        } else {
          // Current food is a lower-quality duplicate
          toDelete.push(food._id);
        }
      }
    });

    console.log(`🔍 Analysis Complete.`);
    console.log(`✅ Unique items to keep: ${foodMap.size}`);
    console.log(`🗑️ Redundant items to remove: ${toDelete.length}`);

    if (toDelete.length > 0) {
      console.log(`🚀 Executing cleanup in batches...`);
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
        const chunk = toDelete.slice(i, i + CHUNK_SIZE);
        await FoodItem.deleteMany({ _id: { $in: chunk } });
        console.log(`🧹 Deleted ${Math.min(i + CHUNK_SIZE, toDelete.length)} items...`);
      }
    }

    console.log('✨ Database is now clean and optimized for production!');
    process.exit();
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
};

cleanDatabase();
