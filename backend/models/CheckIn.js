import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema({
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
  mood: {
    type: String, // e.g., Emoji representations or keywords
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  satiety: {
    type: Number,
    min: 1,
    max: 10
  }
}, { timestamps: true });

const CheckIn = mongoose.model('CheckIn', checkInSchema);
export default CheckIn;
