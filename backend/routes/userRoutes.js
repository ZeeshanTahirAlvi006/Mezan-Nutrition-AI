import express from 'express';
import { registerUser, authUser, updateUserProfile, getUserProfile, googleLogin } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Legacy routes mapped to syncUserProfile in the controller
router.post('/register', protect, registerUser);
router.post('/login', protect, authUser);
router.post('/google-login', protect, googleLogin);

// Profile routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;

