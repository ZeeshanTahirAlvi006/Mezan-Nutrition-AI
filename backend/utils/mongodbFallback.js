import mongoose from 'mongoose';

let isMongoConnected = false;

export const connectMongoDB = async () => {
  if (isMongoConnected) return true;
  if (!process.env.MONGO_URI) {
    console.warn("[MongoDB Fallback] MONGO_URI is missing in .env");
    return false;
  }
  
  try {
    console.log("[MongoDB Fallback] Connecting to MongoDB Atlas...");
    // Keep connection settings optimized
    await mongoose.connect(process.env.MONGO_URI);
    isMongoConnected = true;
    console.log("[MongoDB Fallback] Successfully connected to MongoDB Atlas! 🍃");
    return true;
  } catch (err) {
    console.error("[MongoDB Fallback] Connection to MongoDB failed:", err.message);
    return false;
  }
};

// Define Schema for Daily Logs Fallback
const DailyLogMongoSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // "userId_dateString"
  userId: { type: String, required: true },
  date: { type: String, required: true },
  foodItems: { type: Array, default: [] },
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate compilation model compile errors
export const MongoDailyLog = mongoose.models.MongoDailyLog || mongoose.model('MongoDailyLog', DailyLogMongoSchema);
