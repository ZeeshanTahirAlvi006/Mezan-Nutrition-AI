import { auth, db } from '../config/firebase.js';

const userCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

const invalidateUserCache = (uid) => {
  if (uid) {
    userCache.delete(uid);
    console.log(`[User Cache] Invalidated cache for UID: ${uid}`);
  }
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify Firebase ID Token (handled by Firebase Auth, independent of Firestore quota)
      const decodedToken = await auth.verifyIdToken(token);
      
      // Fetch user profile from Firestore with a graceful fallback for quota exhaustion or DB offline
      try {
        const cached = userCache.get(decodedToken.uid);
        const now = Date.now();
        
        if (cached && now - cached.timestamp < CACHE_TTL) {
          req.user = cached.user;
          console.log(`[User Cache] Cache hit for UID: ${decodedToken.uid}`);
        } else {
          const userDoc = await db.collection('users').doc(decodedToken.uid).get();
          let userData;
          
          if (!userDoc.exists) {
            // User is authenticated in Firebase but doesn't have a profile in our DB yet
            userData = { uid: decodedToken.uid, email: decodedToken.email };
          } else {
            userData = { uid: decodedToken.uid, ...userDoc.data() };
          }
          
          userCache.set(decodedToken.uid, { user: userData, timestamp: now });
          req.user = userData;
          console.log(`[User Cache] Cache miss & populate for UID: ${decodedToken.uid}`);
        }
      } catch (firestoreError) {
        console.error("Firestore database error (falling back to decoded token):", firestoreError.message);
        // Resilient fallback: use the verified token data so the user isn't logged out
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          role: 'user' // Default role
        };
      }

      if (req.user.isDisabled) {
        return res.status(401).json({ message: 'Account has been disabled' });
      }
      
      return next();
    } catch (error) {
      console.error("Firebase auth error:", error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export { protect, invalidateUserCache };

