import { db } from '../config/firebase.js';
import { validateUser } from '../models/User.js';
import { recalculateStreak } from '../utils/streak.js';

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = async (req, res) => {
  try {
    try {
      // Recalculate streak to ensure the streakCount is accurate on page load
      await recalculateStreak(req.user.uid);

      const userRef = db.collection('users').doc(req.user.uid);
      const doc = await userRef.get();

      if (doc.exists) {
        return res.json({
          _id: doc.id,
          uid: doc.id,
          ...doc.data()
        });
      } else {
        return res.status(404).json({ message: 'User profile not found in database' });
      }
    } catch (firestoreError) {
      console.error("Firestore error in getUserProfile (using fallback):", firestoreError.message);
      // Graceful fallback during Firestore quota exhaustion or DB offline
      return res.json({
        _id: req.user.uid,
        uid: req.user.uid,
        email: req.user.email,
        name: req.user.name || req.user.email?.split('@')[0] || 'User',
        role: req.user.role || 'user',
        isQuotaExceededFallback: true
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const doc = await userRef.get();

    let existingData = doc.exists ? doc.data() : {};
    
    // Merge new data
    const updatedData = {
      ...existingData,
      ...req.body,
      updatedAt: new Date()
    };

    // Remove fields we don't want to accidentally overwrite or that belong to Firebase Auth
    delete updatedData.password;
    delete updatedData.uid;

    // Validate against Zod schema
    const validatedData = validateUser(updatedData);

    await userRef.set(validatedData, { merge: true });

    res.json({
      _id: req.user.uid,
      uid: req.user.uid,
      ...validatedData
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sync/Create user profile after Firebase Auth sign up or Google Login
// @route   POST /api/users/sync
// @route   POST /api/users/google-login (Legacy route mapped to sync)
// @route   POST /api/users/register (Legacy route mapped to sync)
const syncUserProfile = async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Create new profile
      const newData = {
        email: req.user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'user',
        ...req.body // any initial setup data from signup form
      };
      
      // Cleanup
      delete newData.password;

      const validatedData = validateUser(newData);
      await userRef.set(validatedData);
      
      res.status(201).json({
        _id: req.user.uid,
        uid: req.user.uid,
        ...validatedData
      });
    } else {
      // User already exists, just return profile
      res.json({
        _id: doc.id,
        uid: doc.id,
        ...doc.data()
      });
    }
  } catch (error) {
     if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token (Legacy fallback, now just syncs)
// @route   POST /api/users/login
const authUser = async (req, res) => {
  // Handled entirely by frontend Firebase Auth now.
  // This endpoint can just trigger a sync if called.
  return syncUserProfile(req, res);
};

export { getUserProfile, updateUserProfile, syncUserProfile, authUser, syncUserProfile as registerUser, syncUserProfile as googleLogin };
