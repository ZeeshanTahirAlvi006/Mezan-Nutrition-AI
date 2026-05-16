import express from 'express';
import {
  generateMealPlan,
  saveMealPlan,
  getCurrentMealPlan,
  suggestReplacement,
  commitReplacement
} from '../controllers/mealPlanController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/generate').post(protect, generateMealPlan);
router.route('/save').post(protect, saveMealPlan);
router.route('/current').get(protect, getCurrentMealPlan);
router.route('/suggest-replacement').post(protect, suggestReplacement);
router.route('/commit-replacement').post(protect, commitReplacement);

export default router;
