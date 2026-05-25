import { db } from '../config/firebase.js';
import { validateCheckIn } from '../models/CheckIn.js';

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

    const checkInsRef = db.collection('checkIns');
    const snapshot = await checkInsRef
      .where('userId', '==', req.user.uid)
      .where('date', '==', dateString)
      .limit(1)
      .get();

    let checkInRef;
    let checkInData;

    if (!snapshot.empty) {
      // Update
      const doc = snapshot.docs[0];
      checkInRef = doc.ref;
      const existing = doc.data();

      checkInData = {
        userId: req.user.uid,
        date: dateString,
        mood: mood || existing.mood,
        energyLevel: energyLevel || existing.energyLevel,
        satiety: satiety || existing.satiety,
        createdAt: existing.createdAt || new Date(),
        updatedAt: new Date()
      };
    } else {
      // Create new
      checkInRef = checkInsRef.doc();
      checkInData = {
        userId: req.user.uid,
        date: dateString,
        mood,
        energyLevel: energyLevel ? Number(energyLevel) : undefined,
        satiety: satiety ? Number(satiety) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const validatedCheckIn = validateCheckIn(checkInData);
    await checkInRef.set(validatedCheckIn);

    res.status(201).json({
      _id: checkInRef.id,
      ...validatedCheckIn
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    console.error('Create CheckIn Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export { createCheckIn };
