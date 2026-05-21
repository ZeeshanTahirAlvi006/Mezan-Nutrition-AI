import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { validatePassword } from '../utils/validatePassword.js';
import bcrypt from 'bcryptjs';
import { recalculateStreak } from '../utils/streak.js';

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(12); // Increased cost factor to 12
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'user',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.isDisabled) {
      return res.status(401).json({ message: 'Account has been disabled' });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = async (req, res) => {
  try {
    await recalculateStreak(req.user._id);
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.email !== undefined) {
        const email = String(req.body.email).trim().toLowerCase();
        if (email !== user.email) {
          const emailExists = await User.findOne({ email });
          if (emailExists) {
            return res.status(400).json({ message: 'Email already in use' });
          }
          user.email = email;
        }
      }

      if (req.body.password !== undefined && String(req.body.password).trim() !== '') {
        const passwordError = validatePassword(req.body.password);
        if (passwordError) {
          return res.status(400).json({ message: passwordError });
        }
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      if (req.body.age !== undefined) {
        const age = Number(req.body.age);
        if (isNaN(age) || age < 1 || age > 120 || !Number.isInteger(age)) {
          return res.status(400).json({ message: 'Age must be an integer between 1 and 120' });
        }
        user.age = age;
      }

      if (req.body.weight !== undefined) {
        const weight = Number(req.body.weight);
        if (isNaN(weight) || weight <= 0 || weight > 500) {
          return res.status(400).json({ message: 'Weight must be a positive number up to 500' });
        }
        user.weight = weight;
      }

      if (req.body.height !== undefined) {
        const height = Number(req.body.height);
        if (isNaN(height) || height <= 0 || height > 300) {
          return res.status(400).json({ message: 'Height must be a positive number up to 300' });
        }
        user.height = height;
      }

      if (req.body.healthGoals !== undefined) {
        user.healthGoals = String(req.body.healthGoals).trim() || user.healthGoals;
      }

      if (req.body.restrictions !== undefined) {
        if (!Array.isArray(req.body.restrictions)) {
          return res.status(400).json({ message: 'Restrictions must be an array' });
        }
        user.restrictions = req.body.restrictions.map(r => String(r).trim());
      }

      if (req.body.location !== undefined) {
        user.location = String(req.body.location).trim();
      }

      if (req.body.pantry !== undefined) {
        if (!Array.isArray(req.body.pantry)) {
          return res.status(400).json({ message: 'Pantry must be an array' });
        }
        user.pantry = req.body.pantry.map(r => String(r).trim()).filter(Boolean);
      }

      if (req.body.targetCalories !== undefined) {
        const targetCalories = Number(req.body.targetCalories);
        if (isNaN(targetCalories) || targetCalories < 500 || targetCalories > 10000 || !Number.isInteger(targetCalories)) {
          return res.status(400).json({ message: 'Target calories must be an integer between 500 and 10000' });
        }
        user.targetCalories = targetCalories;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        age: updatedUser.age,
        weight: updatedUser.weight,
        height: updatedUser.height,
        healthGoals: updatedUser.healthGoals,
        restrictions: updatedUser.restrictions,
        location: updatedUser.location,
        streakCount: updatedUser.streakCount,
        pantry: updatedUser.pantry,
        targetCalories: updatedUser.targetCalories,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, authUser, updateUserProfile, getUserProfile };
