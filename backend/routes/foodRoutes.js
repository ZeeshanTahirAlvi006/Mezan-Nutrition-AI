import express from 'express';
import { searchFood } from '../controllers/foodController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/search').get(protect, searchFood);

export default router;
