import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const userCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

const invalidateUserCache = (uid) => {
  if (uid) {
    userCache.delete(uid);
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

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check cache first
      const cached = userCache.get(decoded.id);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_TTL) {
        req.user = cached.user;
      } else {
        // Fetch user from MongoDB (exclude password)
        const user = await User.findById(decoded.id).select('-password').lean();

        if (!user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        // Normalize: set uid = _id string for compatibility
        const userData = {
          ...user,
          _id: user._id.toString(),
          uid: user._id.toString(),
        };

        userCache.set(decoded.id, { user: userData, timestamp: now });
        req.user = userData;
      }

      if (req.user.isDisabled) {
        return res.status(401).json({ message: 'Account has been disabled' });
      }

      return next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export { protect, invalidateUserCache };
