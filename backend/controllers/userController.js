import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { validatePassword } from '../utils/validatePassword.js';
import bcrypt from 'bcryptjs';

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
      user.age = req.body.age || user.age;
      user.weight = req.body.weight || user.weight;
      user.height = req.body.height || user.height;
      user.healthGoals = req.body.healthGoals || user.healthGoals;
      user.restrictions = req.body.restrictions || user.restrictions;
      user.location = req.body.location || user.location;

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
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, authUser, updateUserProfile, getUserProfile };
