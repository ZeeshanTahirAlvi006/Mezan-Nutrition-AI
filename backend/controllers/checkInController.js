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
    parsedDate.setHours(0, 0, 0, 0);
    const dateString = parsedDate.toISOString();

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

    const userId = req.user._id.toString();

    // Upsert: find existing or create new
    const existingCheckIn = await CheckIn.findOne({ userId, date: dateString });

    let savedCheckIn;
    if (existingCheckIn) {
      if (mood) existingCheckIn.mood = mood;
      if (energyLevel) existingCheckIn.energyLevel = Number(energyLevel);
      if (satiety) existingCheckIn.satiety = Number(satiety);
      savedCheckIn = await existingCheckIn.save();
    } else {
      savedCheckIn = await CheckIn.create({
        userId,
        date: dateString,
        mood,
        energyLevel: energyLevel ? Number(energyLevel) : undefined,
        satiety: satiety ? Number(satiety) : undefined,
      });
    }

    res.status(201).json({
      _id: savedCheckIn._id,
      ...savedCheckIn.toObject(),
    });
  } catch (error) {
    console.error('Create CheckIn Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createCheckIn };
