import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    default: 'Global',
  },
  calories: {
    type: Number,
    required: true,
  },
  protein: Number,
  carbs: Number,
  fats: Number,
  fiber: Number,
  vitamin_A: Number,
  vitamin_C: Number,
  sodium: Number,
  sugar: Number
}, { timestamps: true });

foodItemSchema.index({ name: 'text' });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
export default FoodItem;
