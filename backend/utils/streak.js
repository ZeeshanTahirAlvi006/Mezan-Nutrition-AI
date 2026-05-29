import { db } from '../config/firebase.js';

export const recalculateStreak = async (userId) => {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return 0;
    const userData = userDoc.data();

    // Fetch all logs for the user WITHOUT orderBy to avoid composite index requirements
    const logsSnap = await db.collection('dailyLogs').where('userId', '==', userId).get();
    
    if (logsSnap.empty) {
      if (userData.streakCount !== 0) {
        await userRef.update({ streakCount: 0 });
      }
      return 0;
    }

    const logs = logsSnap.docs.map(d => d.data());
    // Sort logs by date descending in-memory
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Extract unique normalized dates
    const logDates = [...new Set(logs.map(log => new Date(log.date).setHours(0, 0, 0, 0)))];

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date(today - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);

    const mostRecentLogDate = logDates[0];

    // If the most recent log is older than yesterday, the streak has been broken
    if (mostRecentLogDate < yesterday) {
      if (userData.streakCount !== 0) {
        await userRef.update({ streakCount: 0 });
      }
      return 0;
    }

    let streak = 0;
    let expectedDate = today;

    // If they haven't logged today yet but logged yesterday, start consecutive checks from yesterday
    if (mostRecentLogDate === yesterday && !logDates.includes(today)) {
      expectedDate = yesterday;
    }

    // Traverse backwards checking for consecutive log days
    while (logDates.includes(expectedDate)) {
      streak++;
      expectedDate = new Date(expectedDate - 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
    }

    // Update and save if streakCount changed
    if (userData.streakCount !== streak) {
      await userRef.update({ streakCount: streak });
    }

    return streak;
  } catch (error) {
    console.error('Recalculate Streak Error (suppressed):', error.message);
    return 0; // Prevent parent failure
  }
};
