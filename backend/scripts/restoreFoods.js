import dotenv from 'dotenv';
dotenv.config();

import { db } from '../config/firebase.js';

const correctFoods = [
  { name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, sugar: 19, sodium: 2 },
  { name: 'Banana (Medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, sugar: 14, sodium: 1 },
  { name: 'Chicken Shawarma (Standard)', calories: 400, protein: 25, carbs: 35, fats: 15, sugar: 2, sodium: 800 },
  { name: 'Falafel (3 pieces)', calories: 170, protein: 5, carbs: 15, fats: 10, sugar: 1, sodium: 290 },
  { name: 'Hummus (2 tbsp)', calories: 70, protein: 2, carbs: 4, fats: 5, sugar: 0, sodium: 110 }
];

const restore = async () => {
  console.log('Restoring standard food values in Firestore...');
  const foodsRef = db.collection('foods');
  
  for (const food of correctFoods) {
    const snapshot = await foodsRef.where('name', '==', food.name).get();
    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        await foodsRef.doc(doc.id).update({
          ...food,
          verifiedWithUSDA: false,
          usdaOfficialName: null,
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Restored correct values for: ${food.name}`);
      }
    } else {
      await foodsRef.add({
        ...food,
        verifiedWithUSDA: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Created missing standard item: ${food.name}`);
    }
  }
  console.log('Done restoring standard foods.');
  process.exit(0);
};

restore();
