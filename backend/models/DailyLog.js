import mongoose from 'mongoose';

const embeddedFoodItemSchema = new mongoose.Schema({
  foodId: { type: String, default: null },
  name: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  servings: { type: Number, default: 1 },
}, { _id: false });

const dailyLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: String,
    required: true,
  },
  foodItems: [embeddedFoodItemSchema],
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Compound index for efficient user+date queries
dailyLogSchema.index({ userId: 1, date: 1 });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;
