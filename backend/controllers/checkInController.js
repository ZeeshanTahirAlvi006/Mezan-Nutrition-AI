import CheckIn from '../models/CheckIn.js';

// @desc    Create daily check-in
// @route   POST /api/checkin
const createCheckIn = async (req, res) => {
  try {
    const { date, mood, energyLevel, satiety } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required.' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }
    const normalizedDate = parsedDate.setHours(0, 0, 0, 0);

    if (energyLevel !== undefined) {
      const el = Number(energyLevel);
      if (isNaN(el) || el < 1 || el > 10) {
        return res.status(400).json({ message: 'Energy level must be a number between 1 and 10.' });
      }
    }

    if (satiety !== undefined) {
      const sat = Number(satiety);
      if (isNaN(sat) || sat < 1 || sat > 10) {
        return res.status(400).json({ message: 'Satiety must be a number between 1 and 10.' });
      }
    }

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
