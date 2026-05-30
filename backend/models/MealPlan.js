import mongoose from 'mongoose';

const mealItemSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'replaced'],
    default: 'active',
  },
}, { _id: false });

const dailyPlanSchema = new mongoose.Schema({
  date: { type: String, required: true },
  totalCalories: { type: Number, default: 0 },
  meals: {
    Breakfast: [mealItemSchema],
    Lunch: [mealItemSchema],
    Dinner: [mealItemSchema],
    Snacks: [mealItemSchema],
  },
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  days: [dailyPlanSchema],
}, {
  timestamps: true,
});

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
export default MealPlan;
