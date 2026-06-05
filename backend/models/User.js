import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: 'User',
  },
  age: { type: Number, default: null },
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  healthGoals: {
    type: String,
    enum: ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Disease Management'],
    default: 'Maintenance',
  },
  restrictions: { type: [String], default: [] },
  location: { type: String, default: 'UAE' },
  preferredLanguage: { type: String, default: 'English' },
  biologicalSex: { type: String, enum: ['Male', 'Female'], default: 'Male' },
  activityLevel: {
    type: String,
    enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'],
    default: 'Moderately Active',
  },
  dietPreference: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  medicalConditions: { type: [String], default: [] },
  pregnancyStatus: { type: String, enum: ['None', 'Pregnant', 'Lactating'], default: 'None' },
  streakCount: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isDisabled: { type: Boolean, default: false },
  pantry: { type: [String], default: [] },
  targetCalories: { type: Number, default: 2000 },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
