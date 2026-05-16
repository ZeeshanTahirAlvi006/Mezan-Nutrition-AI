import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FoodItem from './models/FoodItem.js';
import connectDB from './config/db.js';

dotenv.config();

const sampleFoods = [
  { name: 'Al Rawabi Whole Milk (1 Cup)', calories: 150, protein: 8, carbs: 12, fats: 8, sugar: 12, sodium: 120, barcode: '6291001221111' },
  { name: 'Almarai Low Fat Yogurt', calories: 60, protein: 5, carbs: 7, fats: 1, sugar: 6, sodium: 65, barcode: '6281001112222' },
  { name: 'Chicken Shawarma (Standard)', calories: 400, protein: 25, carbs: 35, fats: 15, sugar: 2, sodium: 800 },
  { name: 'Falafel (3 pieces)', calories: 170, protein: 5, carbs: 15, fats: 10, sugar: 1, sodium: 290 },
  { name: 'Hummus (2 tbsp)', calories: 70, protein: 2, carbs: 4, fats: 5, sugar: 0, sodium: 110 },
  { name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, sugar: 19, sodium: 2 },
  { name: 'Banana (Medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, sugar: 14, sodium: 1 },
  { name: 'Grilled Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6, sugar: 0, sodium: 74 },
  { name: 'White Rice (1 Cup Cooked)', calories: 205, protein: 4, carbs: 45, fats: 0.4, sugar: 0.1, sodium: 2 },
  { name: 'Eggs (2 Large Boiled)', calories: 140, protein: 12, carbs: 1, fats: 10, sugar: 0, sodium: 140 },
  { name: 'Carrefour Whole Wheat Bread (1 slice)', calories: 70, protein: 3, carbs: 12, fats: 1, sugar: 1, sodium: 130 },
  { name: 'Al Ain Water (500ml)', calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, sodium: 5, barcode: '6290001110000' }
];

const importData = async () => {
  try {
    await connectDB();
    await FoodItem.deleteMany(); // Clear existing
    await FoodItem.insertMany(sampleFoods);
    console.log('✅ Food database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
