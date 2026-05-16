import CheckIn from '../models/CheckIn.js';

// @desc    Create daily check-in
// @route   POST /api/checkin
const createCheckIn = async (req, res) => {
  try {
    const { date, mood, energyLevel, satiety } = req.body;
    
    // Normalize date to midnight
    const normalizedDate = new Date(date).setHours(0,0,0,0);

    // See if a check-in already exists for today
    let checkIn = await CheckIn.findOne({
      userId: req.user._id,
      date: normalizedDate
    });

    if (checkIn) {
      // Update
      checkIn.mood = mood || checkIn.mood;
      checkIn.energyLevel = energyLevel || checkIn.energyLevel;
      checkIn.satiety = satiety || checkIn.satiety;
      await checkIn.save();
    } else {
      // Create new
      checkIn = await CheckIn.create({
        userId: req.user._id,
        date: normalizedDate,
        mood,
        energyLevel,
        satiety
      });
    }

    res.status(201).json(checkIn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createCheckIn };
