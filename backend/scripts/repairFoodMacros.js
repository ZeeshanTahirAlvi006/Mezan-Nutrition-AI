import dotenv from 'dotenv';
import mongoose from 'mongoose';
import FoodItem from '../models/FoodItem.js';
import connectDB from '../config/db.js';

dotenv.config({ path: 'backend/.env' });

const SPECIFIC_REPAIRS = [
  // 1/2 lb. FlameThrower® GrillBurger
  {
    match: { name: "1/2 lb. FlameThrower® GrillBurger" },
    update: { fats: 66, calories: 1000 }
  },
  // 1/2 lb. GrillBurger with Cheese
  {
    match: { name: "1/2 lb. GrillBurger with Cheese" },
    update: { fats: 46, calories: 800 }
  },
  // 1/4 lb. Bacon Cheese GrillBurger
  {
    match: { name: "1/4 lb. Bacon Cheese GrillBurger" },
    update: { fats: 33, calories: 630 }
  },
  // 1/4 lb. GrillBurger with Cheese
  {
    match: { name: "1/4 lb. GrillBurger with Cheese" },
    update: { fats: 27, calories: 540 }
  },
  // 1/4 lb. Mushroom Swiss GrillBurger
  {
    match: { name: "1/4 lb. Mushroom Swiss GrillBurger" },
    update: { fats: 31, calories: 570 }
  },
  // Ultimate Chicken Club
  {
    match: { name: "Ultimate Chicken Club" },
    update: { fats: 58, calories: 950 }
  },
  // Roti
  {
    match: { name: "Roti" },
    update: { calories: 120, protein: 3.5, carbs: 22, fats: 1.5 }
  },
  // Milk (2%
  {
    match: { name: "Milk (2%" },
    update: { calories: 120, protein: 8, carbs: 12, fats: 5 }
  },
  // Margarita (1 drink
  {
    match: { name: "Margarita (1 drink" },
    update: { calories: 200, protein: 0.1, carbs: 20, fats: 0 }
  },
  // Sugar (1 tsp
  {
    match: { name: "Sugar (1 tsp" },
    update: { calories: 16, protein: 0, carbs: 4, fats: 0 }
  },
  // Butter
  {
    match: { name: "Butter" },
    update: { calories: 717, protein: 0.9, carbs: 0.1, fats: 81 }
  },
  // Oysters
  {
    match: { name: "Oysters" },
    update: { calories: 81, protein: 9, carbs: 5, fats: 2 }
  },
  // White, 20 slices, or
  {
    match: { name: "White, 20 slices, or" },
    update: { calories: 1500, protein: 39, carbs: 229, fats: 15 }
  },
  // Whole-wheat
  {
    match: { name: "Whole-wheat" },
    update: { calories: 1400, protein: 48, carbs: 216, fats: 14 }
  }
];

const repairFoodDatabase = async () => {
  try {
    await connectDB();
    console.log('⚡ Repairing food macros database... Connected!');

    // 1. Perform targeted specific repairs
    console.log('\n🔨 Phase 1: Applying targeted specific repairs...');
    for (const repair of SPECIFIC_REPAIRS) {
      const items = await FoodItem.find(repair.match);
      if (items.length > 0) {
        for (const item of items) {
          const oldFats = item.fats;
          const oldProtein = item.protein;
          const oldCarbs = item.carbs;
          const oldCalories = item.calories;

          await FoodItem.updateOne({ _id: item._id }, { $set: repair.update });
          console.log(`   ✅ Repaired "${item.name}":`);
          console.log(`      Before -> Cal: ${oldCalories}, P: ${oldProtein}g, C: ${oldCarbs}g, F: ${oldFats}g`);
          console.log(`      After  -> Cal: ${repair.update.calories}, P: ${repair.update.protein || item.protein}g, C: ${repair.update.carbs || item.carbs}g, F: ${repair.update.fats || item.fats}g`);
        }
      } else {
        console.log(`   ⚠️ Could not find exact match for repair: "${repair.match.name}"`);
      }
    }

    // 2. Automated sweep for shifted/inflated values (e.g. Fats/Protein/Carbs that exceed standard physical ratios)
    console.log('\n🔍 Phase 2: Running automated database sweep for shifted/inflated macros...');
    
    // We target items with calories > 0 and where fats * 9 is way larger than total calories (by a factor of 1.5x)
    const candidates = await FoodItem.find({ calories: { $gt: 0 } });
    let automaticRepairs = 0;

    for (const item of candidates) {
      // Check if item's fats or other macros are physically impossible
      // 1g fat = 9 kcal, 1g protein = 4 kcal, 1g carb = 4 kcal
      const fatKcal = item.fats * 9;
      const proteinKcal = item.protein * 4;
      const carbKcal = item.carbs * 4;
      const theoreticalMaxKcal = fatKcal + proteinKcal + carbKcal;

      // If theoretical calories based on macros exceeds actual calories by more than 50%
      if (theoreticalMaxKcal > item.calories * 1.5) {
        let needsFix = false;
        const updateObj = {};

        // Look for values that are likely 10x too large (i.e. missing a decimal point)
        if (fatKcal > item.calories * 1.2 && item.fats >= 10) {
          updateObj.fats = Math.round(item.fats / 10);
          needsFix = true;
        }
        if (proteinKcal > item.calories * 1.2 && item.protein >= 10) {
          updateObj.protein = Math.round(item.protein / 10);
          needsFix = true;
        }
        if (carbKcal > item.calories * 1.2 && item.carbs >= 10) {
          updateObj.carbs = Math.round(item.carbs / 10);
          needsFix = true;
        }

        if (needsFix) {
          await FoodItem.updateOne({ _id: item._id }, { $set: updateObj });
          automaticRepairs++;
          console.log(`   ⚡ Auto-Repaired "${item.name}" (ID: ${item._id}):`);
          console.log(`      Before -> Cal: ${item.calories}, P: ${item.protein}g, C: ${item.carbs}g, F: ${item.fats}g`);
          console.log(`      After  -> Cal: ${item.calories}, P: ${updateObj.protein !== undefined ? updateObj.protein : item.protein}g, C: ${updateObj.carbs !== undefined ? updateObj.carbs : item.carbs}g, F: ${updateObj.fats !== undefined ? updateObj.fats : item.fats}g`);
        }
      }
    }

    console.log(`\n🎉 Automatic database sweep complete! Automatically repaired ${automaticRepairs} shifted food items.`);
    console.log('✨ All food database macro repairs completed successfully.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database repair failed:', error.message);
    process.exit(1);
  }
};

repairFoodDatabase();
