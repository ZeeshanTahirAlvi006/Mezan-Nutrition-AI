import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';

export const recalculateStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return 0;

    const logs = await DailyLog.find({ userId }).sort({ date: -1 }).lean();

    if (logs.length === 0) {
      if (user.streakCount !== 0) {
        user.streakCount = 0;
        await user.save();
      }
      return 0;
    }

    // Extract unique normalized dates
    const logDates = [...new Set(logs.map(log => new Date(log.date).setHours(0, 0, 0, 0)))];

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);

    const mostRecentLogDate = logDates[0];

    // If the most recent log is older than yesterday, the streak has been broken
    if (mostRecentLogDate < yesterday) {
      if (user.streakCount !== 0) {
        user.streakCount = 0;
        await user.save();
      }
      return 0;
    }

    let streak = 0;
    let expectedDate = today;

    // If they haven't logged today yet but logged yesterday, start from yesterday
    if (mostRecentLogDate === yesterday && !logDates.includes(today)) {
      expectedDate = yesterday;
    }

    // Traverse backwards checking for consecutive log days
    while (logDates.includes(expectedDate)) {
      streak++;
      expectedDate = new Date(expectedDate - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
    }

    // Update and save if streakCount changed
    if (user.streakCount !== streak) {
      user.streakCount = streak;
      await user.save();
    }

    return streak;
  } catch (error) {
    console.error('Recalculate Streak Error (suppressed):', error.message);
    return 0;
  }
};
