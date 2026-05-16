import mongoose from 'mongoose';

const mealItemSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fats: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['active', 'replaced'], 
    default: 'active' 
  }
});

const dailyPlanSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalCalories: { type: Number, required: true },
  meals: {
    Breakfast: [mealItemSchema],
    Lunch: [mealItemSchema],
    Dinner: [mealItemSchema],
    Snacks: [mealItemSchema]
  }
});

const mealPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  days: [dailyPlanSchema]
}, { timestamps: true });

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);
export default MealPlan;
