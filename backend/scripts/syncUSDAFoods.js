import dotenv from 'dotenv';
dotenv.config();

import { db } from '../config/firebase.js';
import { fetchUSDANutrition } from '../services/usdaService.js';

// Curated list of 80+ universal healthy dietary staples to expand our database
const STAPLE_FOODS = [
  // Breakfast & Dairy Staples
  'Oatmeal', 'Egg', 'Egg White', 'Greek Yogurt', 'Cottage Cheese', 
  'Whole Milk', 'Skimmed Milk', 'Almond Milk', 'Soy Milk', 'Butter', 
  'Ghee', 'Cheddar Cheese', 'Mozzarella', 'Whey Protein Powder',
  
  // Lean Proteins
  'Chicken Breast', 'Chicken Thigh', 'Turkey Breast', 'Ground Turkey', 
  'Lean Ground Beef', 'Beef Sirloin Steak', 'Salmon Filet', 'Canned Tuna', 
  'Tilapia Filet', 'Cod Fish', 'Shrimp', 'Tofu', 'Tempeh', 'Eggplant',
  
  // Healthy Grains & Carbs
  'Brown Rice', 'White Rice', 'Jasmine Rice', 'Basmati Rice', 'Quinoa', 
  'Sweet Potato', 'Russet Potato', 'Whole Wheat Bread', 'White Bread', 
  'Whole Wheat Tortilla', 'Rolled Oats', 'Steel Cut Oats', 'Couscous',
  
  // Fruits
  'Banana', 'Red Apple', 'Blueberries', 'Strawberries', 'Raspberries', 
  'Blackberries', 'Orange', 'Grapefruit', 'Peach', 'Pear', 'Pineapple', 
  'Watermelon', 'Green Grapes', 'Avocado', 'Lemon', 'Lime',
  
  // Vegetables
  'Broccoli', 'Spinach', 'Kale', 'Romaine Lettuce', 'Cucumber', 
  'Red Tomato', 'Green Bell Pepper', 'Red Onion', 'Garlic Cloves', 
  'Asparagus', 'Brussels Sprouts', 'Green Beans', 'Carrot', 
  'Cauliflower', 'Zucchini', 'Mushrooms',
  
  // Fats, Nuts & Seeds
  'Peanut Butter', 'Almond Butter', 'Extra Virgin Olive Oil', 
  'Coconut Oil', 'Raw Almonds', 'Walnuts', 'Cashew Nuts', 
  'Chia Seeds', 'Flax Seeds', 'Pumpkin Seeds',
  
  // Hydration & Beverages
  'Black Coffee', 'Green Tea', 'Black Tea', 'Coconut Water'
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runSync = async () => {
  const isSeedMode = process.argv.includes('--seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' USDA FOODDATA CENTRAL API DATABASE MIGRATION & SYNC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Modes: [Verification/Sync: Enabled] [Seeding/Expansion: ${isSeedMode ? 'ENABLED' : 'DISABLED'}]`);
  
  try {
    // ─────────────────────────────────────────────
    //  STEP 1: CROSS-VERIFY EXISTING FOODS
    // ─────────────────────────────────────────────
    const skipVerify = process.argv.includes('--skip-verify');
    const foodsRef = db.collection('foods');
    const snapshot = await foodsRef.get();
    
    if (skipVerify) {
      console.log('\n--- PHASE 1: Skipping verification as requested via --skip-verify ---');
    } else if (snapshot.empty) {
      console.log('Local foods database is empty. Skipping verification.');
    } else {
      const localFoods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Found ${localFoods.length} local items to verify.`);
      
      for (let i = 0; i < localFoods.length; i++) {
        const local = localFoods[i];
        console.log(`[${i+1}/${localFoods.length}] Verifying: "${local.name}"`);
        
        // Fetch official values from USDA
        const usdaItem = await fetchUSDANutrition(local.name);
        if (usdaItem) {
          console.log(`   -> Found in USDA: "${usdaItem.name}"`);
          console.log(`   -> Macros updated: Cal:${usdaItem.calories} P:${usdaItem.protein}g C:${usdaItem.carbs}g F:${usdaItem.fats}g`);
          
          await foodsRef.doc(local.id).update({
            name: local.name, // Keep local readable name
            usdaOfficialName: usdaItem.name,
            calories: usdaItem.calories,
            protein: usdaItem.protein,
            carbs: usdaItem.carbs,
            fats: usdaItem.fats,
            fdcId: usdaItem.fdcId,
            verifiedWithUSDA: true,
            updatedAt: new Date().toISOString()
          });
        } else {
          console.log(`   -> No USDA match found for "${local.name}". Keeping local values.`);
        }
        
        // Wait 1.5 seconds to respect USDA rate limits
        await delay(1500);
      }
      console.log('Phase 1 Verification Complete! Existing entries verified.');
    }
    
    // ─────────────────────────────────────────────
    //  STEP 2: SEED & EXPAND FOUNDATIONAL STAPLES
    // ─────────────────────────────────────────────
    if (isSeedMode) {
      console.log('\n--- PHASE 2: Seeding & Database Expansion ---');
      console.log(`Targeting ${STAPLE_FOODS.length} healthy staples for verification and seeding.`);
      
      // Load current index to avoid duplicates
      const freshSnap = await foodsRef.get();
      const existingNames = freshSnap.docs.map(doc => (doc.data().name || '').toLowerCase());
      
      let seededCount = 0;
      
      for (let i = 0; i < STAPLE_FOODS.length; i++) {
        const staple = STAPLE_FOODS[i];
        
        // Check duplicate
        if (existingNames.some(name => name.includes(staple.toLowerCase()) || staple.toLowerCase().includes(name))) {
          console.log(`[${i+1}/${STAPLE_FOODS.length}] Staple "${staple}" already exists or overlaps. Skipping.`);
          continue;
        }
        
        console.log(`[${i+1}/${STAPLE_FOODS.length}] Seeding new staple: "${staple}"`);
        const usdaItem = await fetchUSDANutrition(staple);
        
        if (usdaItem) {
          const newDoc = {
            name: staple,
            usdaOfficialName: usdaItem.name,
            calories: usdaItem.calories,
            protein: usdaItem.protein,
            carbs: usdaItem.carbs,
            fats: usdaItem.fats,
            fdcId: usdaItem.fdcId,
            verifiedWithUSDA: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await foodsRef.add(newDoc);
          seededCount++;
          console.log(`   -> Successfully seeded: ${staple} (FDC ID: ${usdaItem.fdcId}) ✅`);
        } else {
          console.log(`   -> Failed to fetch USDA data for staple "${staple}".`);
        }
        
        // Wait 1.8 seconds to respect USDA rate limits
        await delay(1800);
      }
      console.log(`\nPhase 2 Seeding Complete! Expanded database with ${seededCount} new premium healthy staples.`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' DATABASE SYNC & SEEDING OPERATIONS COMPLETED SUCCESSFULLY! ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      console.log('\n⚠️  [USDA API Rate Limit Reached (429 Too Many Requests)]');
      console.log('The public USDA DEMO_KEY is strictly capped at 30 requests per hour.');
      console.log('To synchronize large databases (e.g. 6,800+ items) or run extensive seeds,');
      console.log('please obtain a free private USDA API Key at https://api.data.gov/signup/');
      console.log('and add it to your .env file:');
      console.log('   USDA_API_KEY=your_private_api_key_here');
      console.log('\nGracefully exiting operation without database corruption. 🚀');
      process.exit(0);
    }
    console.error('\n❌ CRITICAL SYNCHRONIZATION ERROR:', error.message);
    process.exit(1);
  }
};

runSync();
