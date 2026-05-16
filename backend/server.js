import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import userRoutes from './routes/userRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import logRoutes from './routes/logRoutes.js';
import checkInRoutes from './routes/checkInRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import mealPlanRoutes from './routes/mealPlanRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Validate Environment Variables
const requiredEnvs = ['JWT_SECRET', 'MISTRAL_API_KEY'];
requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    console.error(`CRITICAL ERROR: ${env} is not defined in environment variables.`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is shorter than 32 characters. Consider using a stronger secret.');
}

// CORS Configuration (Must be at the top to handle preflight)
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'https://mezannutritionai.vercel.app', // Explicitly allow your Vercel domain
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow cross-origin resources
}));
// Custom Mongo Sanitize Middleware (Express 5 compatible)
const mongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  if (req.query) sanitize(req.query);
  next();
};


// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// Stricter rate limit for Auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts
  message: { message: 'Too many login/register attempts, please try again later' }
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Too many admin requests, please try again later' },
});

app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize);


// Connect to Database
connectDB();

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// Global Error Handler (to prevent leaking stack traces)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message
  });
});

// SERVE FRONTEND STATIC FILES
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle client-side routing (SPA)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'API Route Not Found' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
