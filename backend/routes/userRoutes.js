import express from 'express';
import { registerUser, authUser, updateUserProfile, getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public auth routes
router.post('/register', registerUser);
router.post('/login', authUser);

// Protected profile routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
