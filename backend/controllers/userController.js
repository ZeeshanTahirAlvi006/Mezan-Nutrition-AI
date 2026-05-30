import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { recalculateStreak } from '../utils/streak.js';
import { invalidateUserCache } from '../middleware/auth.js';

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name: name || email.split('@')[0],
      ...req.body,
    });

    res.status(201).json({
      _id: user._id,
      uid: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
const authUser = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      if (user.isDisabled) {
        return res.status(401).json({ message: 'Account has been disabled' });
      }

      res.json({
        _id: user._id,
        uid: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        healthGoals: user.healthGoals,
        location: user.location,
        restrictions: user.restrictions,
        age: user.age,
        weight: user.weight,
        height: user.height,
        pantry: user.pantry,
        targetCalories: user.targetCalories,
        streakCount: user.streakCount,
        token: generateToken(user._id, rememberMe),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Recalculate streak in the background
    recalculateStreak(req.user._id.toString()).catch(err =>
      console.error('Background streak recalculate failed:', err)
    );

    res.json({
      _id: user._id,
      uid: user._id.toString(),
      ...user.toObject(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fields allowed to update
    const allowedFields = [
      'name', 'age', 'weight', 'height', 'healthGoals',
      'restrictions', 'location', 'pantry', 'targetCalories'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    const updatedUser = await user.save();
    invalidateUserCache(req.user._id.toString());

    res.json({
      _id: updatedUser._id,
      uid: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      age: updatedUser.age,
      weight: updatedUser.weight,
      height: updatedUser.height,
      healthGoals: updatedUser.healthGoals,
      restrictions: updatedUser.restrictions,
      location: updatedUser.location,
      pantry: updatedUser.pantry,
      targetCalories: updatedUser.targetCalories,
      streakCount: updatedUser.streakCount,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
};
