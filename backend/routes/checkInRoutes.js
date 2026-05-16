import express from 'express';
import { createCheckIn } from '../controllers/checkInController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').post(protect, createCheckIn);

export default router;
