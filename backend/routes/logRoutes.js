import express from 'express';
import { createDailyLog, getDailyLog, getWeeklyLogs, removeFoodItemFromLog } from '../controllers/logController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/daily').post(protect, createDailyLog);
router.route('/weekly').get(protect, getWeeklyLogs);
router.route('/daily/:date').get(protect, getDailyLog);
router.route('/daily/:date/item/:index').delete(protect, removeFoodItemFromLog);

export default router;
