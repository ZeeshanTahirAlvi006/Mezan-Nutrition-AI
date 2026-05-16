/**
 * Normalize a single CSV row into a FoodItem-shaped object.
 */
export const parseFoodRow = (data) => {
  const normalize = (keys, obj) => {
    for (const key of keys) {
      const found = Object.keys(obj).find((k) => k.toLowerCase().includes(key.toLowerCase()));
      if (found) {
        const val = obj[found];
        if (val === 't' || val === 'trace') return 0;
        return parseFloat(val) || 0;
      }
    }
    return 0;
  };

  const nameKeys = ['food_item', 'food', 'item', 'description', 'name'];
  const nameFound = Object.keys(data).find((k) => nameKeys.includes(k.toLowerCase()));
  const name = nameFound ? data[nameFound] : null;

  if (!name || !String(name).trim()) {
    return null;
  }

  const countryVal = data.country || data.Country || data.region;
  return {
    name: String(name).trim(),
    country: countryVal ? String(countryVal).trim() : 'Global',
    calories: normalize(['calories', 'kcal', 'caloric value', 'energy'], data),
    protein: normalize(['protein', 'prot'], data),
    carbs: normalize(['carbohydrates', 'carbs', 'carb'], data),
    fats: normalize(['fat', 'fats', 'lipid'], data),
    sugar: normalize(['sugar', 'sugars'], data),
    sodium: normalize(['sodium', 'na'], data),
    fiber: normalize(['fiber', 'fibre'], data),
  };
};

/**
 * Parse CSV buffer/string rows (array of plain objects from csv-parser).
 */
export const parseFoodRows = (rows) => {
  const parsed = [];
  const errors = [];

  rows.forEach((row, index) => {
    try {
      const item = parseFoodRow(row);
      if (!item) {
        errors.push({ row: index + 1, message: 'Missing food name' });
        return;
      }
      if (item.calories === undefined || Number.isNaN(item.calories)) {
        errors.push({ row: index + 1, message: 'Invalid calories', name: item.name });
        return;
      }
      parsed.push(item);
    } catch (e) {
      errors.push({ row: index + 1, message: e.message });
    }
  });

  return { parsed, errors };
};

export const validateFoodPayload = (body, isUpdate = false) => {
  const errors = [];
  if (!isUpdate && (!body.name || !String(body.name).trim())) {
    errors.push('Name is required');
  }
  if (!isUpdate && (body.calories === undefined || body.calories === null)) {
    errors.push('Calories is required');
  }
  const nums = ['calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
  for (const field of nums) {
    if (body[field] !== undefined && body[field] !== null && Number(body[field]) < 0) {
      errors.push(`${field} cannot be negative`);
    }
  }
  return errors;
};

export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};
