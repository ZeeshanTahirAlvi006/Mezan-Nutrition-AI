import express from 'express';
import { createDailyLog, getDailyLog } from '../controllers/logController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/daily').post(protect, createDailyLog);
router.route('/daily/:date').get(protect, getDailyLog);

export default router;
