import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: String,
    required: true,
  },
  mood: { type: String, default: undefined },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: undefined,
  },
  satiety: {
    type: Number,
    min: 1,
    max: 10,
    default: undefined,
  },
}, {
  timestamps: true,
});

// Compound index for efficient user+date queries
checkInSchema.index({ userId: 1, date: 1 });

const CheckIn = mongoose.model('CheckIn', checkInSchema);
export default CheckIn;
