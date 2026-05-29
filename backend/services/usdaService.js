/**
 * USDA FoodData Central (FDC) API Service Layer
 * Connects directly to the official USDA database to retrieve precise clinical nutrition facts.
 */

// Mapping of USDA nutrient IDs and typical nutrient names to standard macros
const NUTRIENT_MAPPING = {
  calories: { ids: [1008, 2047, 2048], keywords: ['energy', 'kcal', 'calories'] },
  protein: { ids: [1003], keywords: ['protein'] },
  carbs: { ids: [1005], keywords: ['carbohydrate', 'by difference'] },
  fats: { ids: [1004], keywords: ['total lipid', 'fat'] }
};

/**
 * Helper to extract nutrient value by keyword or official USDA nutrient ID
 */
const extractNutrientValue = (nutrients, mapping) => {
  const match = nutrients.find(n => {
    const id = Number(n.nutrientId);
    const name = (n.nutrientName || '').toLowerCase();
    
    // Match by official USDA ID
    if (mapping.ids.includes(id)) return true;
    
    // Match by common descriptive keyword
    return mapping.keywords.some(keyword => name.includes(keyword));
  });
  
  return match ? Number(match.value) || 0 : 0;
};

/**
 * Fetch highly precise nutritional details for a single food item.
 * @param {string} foodName - Name of the food item (e.g. "Chicken Breast")
 * @returns {Promise<Object|null>} Standardized food object or null if not found
 */
export const fetchUSDANutrition = async (foodName) => {
  if (!foodName || !foodName.trim()) return null;
  
  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  const cleanName = foodName.trim();
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(cleanName)}&pageSize=1&api_key=${apiKey}`;
  
  try {
    console.log(`[USDA Service] Querying: "${cleanName}"...`);
    const res = await fetch(url);
    
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      console.warn(`[USDA Service] FDC search failed with status: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) {
      console.log(`[USDA Service] No matching food found for "${cleanName}".`);
      return null;
    }
    
    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];
    
    const calories = extractNutrientValue(nutrients, NUTRIENT_MAPPING.calories);
    const protein = extractNutrientValue(nutrients, NUTRIENT_MAPPING.protein);
    const carbs = extractNutrientValue(nutrients, NUTRIENT_MAPPING.carbs);
    const fats = extractNutrientValue(nutrients, NUTRIENT_MAPPING.fats);
    
    return {
      name: food.description,
      calories: Math.round(calories),
      protein: Number(protein.toFixed(1)),
      carbs: Number(carbs.toFixed(1)),
      fats: Number(fats.toFixed(1)),
      fdcId: food.fdcId
    };
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') throw error;
    console.error(`[USDA Service] Network or parsing error for "${cleanName}":`, error.message);
    return null;
  }
};

/**
 * Search the USDA FoodData Central API for multiple matching food items.
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return (default: 15)
 * @returns {Promise<Array>} Standardized food items list
 */
export const searchUSDAFoods = async (query, limit = 15) => {
  if (!query || query.trim().length < 2) return [];
  
  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  const cleanQ = query.trim();
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(cleanQ)}&pageSize=${limit}&api_key=${apiKey}`;
  
  try {
    console.log(`[USDA Service] Searching for "${cleanQ}" (limit ${limit})...`);
    const res = await fetch(url);
    
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      console.warn(`[USDA Service] FDC search failed with status: ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return [];
    
    return data.foods.map(food => {
      const nutrients = food.foodNutrients || [];
      const calories = extractNutrientValue(nutrients, NUTRIENT_MAPPING.calories);
      const protein = extractNutrientValue(nutrients, NUTRIENT_MAPPING.protein);
      const carbs = extractNutrientValue(nutrients, NUTRIENT_MAPPING.carbs);
      const fats = extractNutrientValue(nutrients, NUTRIENT_MAPPING.fats);
      
      return {
        _id: `usda_${food.fdcId}`,
        name: food.description,
        calories: Math.round(calories),
        protein: Number(protein.toFixed(1)),
        carbs: Number(carbs.toFixed(1)),
        fats: Number(fats.toFixed(1)),
        brand: food.brandOwner || food.brandName || 'USDA Standard Reference'
      };
    });
  } catch (error) {
    console.error(`[USDA Service] Error searching for "${cleanQ}":`, error.message);
    return [];
  }
};
