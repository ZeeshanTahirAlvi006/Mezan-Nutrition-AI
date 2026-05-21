import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  age: Number,
  weight: Number,
  height: Number,
  healthGoals: {
    type: String,
    enum: ['Weight Loss', 'Muscle Gain', 'Maintenance'],
    default: 'Maintenance'
  },
  restrictions: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: 'UAE'
  },
  streakCount: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
  pantry: {
    type: [String],
    default: []
  },
  targetCalories: {
    type: Number,
    default: 2000
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
