import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  foodItems: [{
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem'
    },
    servings: {
      type: Number,
      default: 1
    }
  }],
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 }
  }
}, { timestamps: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;
