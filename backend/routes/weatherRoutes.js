import express from 'express';
import { protect } from '../middleware/auth.js';
import { getWeatherByLocation } from '../services/weatherService.js';

const router = express.Router();

// @desc    Get current weather and 7-day forecast for the authenticated user's location
// @route   GET /api/weather
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Fallback to "UAE" if the user has not registered a location
    const location = req.user.location || 'UAE';
    const weatherData = await getWeatherByLocation(location);
    res.json(weatherData);
  } catch (error) {
    console.error('[Weather Route Error]:', error.message);
    res.status(500).json({ message: 'Failed to fetch weather data: ' + error.message });
  }
});

export default router;
