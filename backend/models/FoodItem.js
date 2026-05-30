import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    default: 'Global',
    trim: true,
  },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 },
  vitamin_A: { type: Number, default: 0 },
  vitamin_C: { type: Number, default: 0 },
  fdcId: { type: Number, default: null },
  usdaOfficialName: { type: String, default: null },
  verifiedWithUSDA: { type: Boolean, default: false },
  barcode: { type: String, default: null },
  category: { type: String, default: null },
}, {
  timestamps: true,
});

// Text index for search
foodItemSchema.index({ name: 'text' });
// Index for country filtering
foodItemSchema.index({ country: 1 });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
export default FoodItem;
