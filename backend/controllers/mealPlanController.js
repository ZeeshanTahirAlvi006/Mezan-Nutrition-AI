import User from '../models/User.js';
import MealPlan from '../models/MealPlan.js';
import DailyLog from '../models/DailyLog.js';
import Message from '../models/Message.js';
import ChatSession from '../models/ChatSession.js';
import { getCompletionWithFallback } from '../services/aiService.js';

// ---------- Helper: Calculate TDEE using Mifflin-St Jeor ----------
const calculateTDEE = (user) => {
  if (user.targetCalories !== undefined && user.targetCalories !== null && user.targetCalories > 0) {
    return user.targetCalories;
  }
  const weight = user.weight || 70;
  const height = user.height || 170;
  const age = user.age || 25;
  // Mifflin-St Jeor (default to male formula, conservative)
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  // Activity multiplier (moderate)
  let tdee = Math.round(bmr * 1.55);
  // Adjust for goal
  if (user.healthGoals === 'Weight Loss') tdee = Math.round(tdee * 0.8);
  if (user.healthGoals === 'Muscle Gain') tdee = Math.round(tdee * 1.15);
  return tdee || 2000;
};

// ---------- Helper: Build AI prompt context ----------
const buildContext = async (user) => {
  // Get recent daily logs (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogs = await DailyLog.find({ userId: user._id, date: { $gte: sevenDaysAgo } })
    .populate('foodItems.foodId', 'name calories protein carbs fats')
    .sort('-date')
    .limit(7)
    .lean();

  const logSummary = recentLogs.map(log => {
    const foods = log.foodItems.map(fi => fi.foodId?.name || 'Unknown').join(', ');
    return `${new Date(log.date).toLocaleDateString()}: ${foods} (${log.totals?.calories || 0} kcal)`;
  }).join('\n') || 'No recent food logs.';

  // Get recent chat messages for preference extraction (SCOPED TO USER)
  const sessions = await ChatSession.find({ user: user._id }).select('_id');
  const sessionIds = sessions.map(s => s._id);

  const recentMessages = await Message.find({
    role: 'user',
    session: { $in: sessionIds }
  })
    .sort('-createdAt')
    .limit(15)
    .select('content')
    .lean();

  const chatSummary = recentMessages.map(m => m.content).join(' | ') || 'No chat history.';

  return { logSummary, chatSummary };
};

// @desc    Generate a 7-day draft meal plan via Mistral AI
// @route   POST /api/meal-plan/generate
const generateMealPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const targetCalories = calculateTDEE(user);
    const { logSummary, chatSummary } = await buildContext(user);

    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const prompt = `You are a world-class nutritionist. Generate a personalized 7-day meal plan.

USER PROFILE:
- Location: ${user.location || 'UAE'}
- Health Goal: ${user.healthGoals || 'Maintenance'}
- Dietary Restrictions: ${user.restrictions?.length > 0 ? user.restrictions.join(', ') : 'None'}
- Items Available at Home (Pantry): ${user.pantry?.length > 0 ? user.pantry.join(', ') : 'None specified (prioritize standard items)'}
- Daily Calorie Target: ${targetCalories} kcal

RECENT EATING HABITS (last 7 days):
${logSummary}

CHAT PREFERENCES (extracted from recent conversations):
${chatSummary}

DATES for the 7 days: ${dates.join(', ')}

CRITICAL INSTRUCTIONS:
1. Each day MUST total close to ${targetCalories} kcal (within 5% tolerance).
2. ALL food items MUST be commonly available in ${user.location || 'UAE'}. Use local brands and dishes.
3. Respect dietary restrictions strictly.
4. Keep the user's home items (pantry) in view and prioritize incorporating these ingredients into the generated meals where appropriate, so that the user can use what they already have at home.
5. Incorporate variety — avoid repeating the same meals across days.
6. Return ONLY valid JSON — no markdown, no code fences, no explanation.

Return EXACTLY this JSON structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "totalCalories": <number>,
      "meals": {
        "Breakfast": [{"foodName": "...", "calories": <number>, "protein": <number>, "carbs": <number>, "fats": <number>}],
        "Lunch": [{"foodName": "...", "calories": <number>, "protein": <number>, "carbs": <number>, "fats": <number>}],
        "Dinner": [{"foodName": "...", "calories": <number>, "protein": <number>, "carbs": <number>, "fats": <number>}],
        "Snacks": [{"foodName": "...", "calories": <number>, "protein": <number>, "carbs": <number>, "fats": <number>}]
      }
    }
  ]
}`;

    const response = await getCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.log('[DEBUG] Initial JSON parse failed. Raw response:', raw.substring(0, 500));
      
      // Try to extract JSON from markdown fences
      const markdownMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (markdownMatch) {
        try {
          parsed = JSON.parse(markdownMatch[1]);
        } catch (e2) {
          console.log('[DEBUG] Markdown extraction failed');
          throw new Error(`Invalid JSON after markdown extraction: ${e2.message}`);
        }
      } else {
        // Try to find JSON object pattern and extract it
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.log('[DEBUG] Direct JSON extraction failed');
            throw new Error(`Invalid JSON from direct extraction: ${e2.message}`);
          }
        } else {
          throw new Error('No JSON found in AI response');
        }
      }
    }

    res.json({ draft: parsed, targetCalories });

  } catch (error) {
    console.error('Generate Meal Plan Error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Failed to generate meal plan: ' + error.message });
  }
};

// @desc    Save confirmed meal plan to DB
// @route   POST /api/meal-plan/save
const saveMealPlan = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ message: 'Invalid meal plan data.' });
    }

    // Delete any existing plan for this user
    await MealPlan.deleteMany({ user: req.user._id });

    const mealPlan = await MealPlan.create({
      user: req.user._id,
      days: days.map(d => ({
        ...d,
        date: new Date(d.date),
        meals: {
          Breakfast: (d.meals?.Breakfast || []).map(item => ({
            ...item,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0
          })),
          Lunch: (d.meals?.Lunch || []).map(item => ({
            ...item,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0
          })),
          Dinner: (d.meals?.Dinner || []).map(item => ({
            ...item,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0
          })),
          Snacks: (d.meals?.Snacks || []).map(item => ({
            ...item,
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fats: Number(item.fats) || 0
          }))
        }
      }))
    });

    res.status(201).json(mealPlan);
  } catch (error) {
    console.error('Save Meal Plan Error:', error);
    res.status(500).json({ message: 'Failed to save meal plan.' });
  }
};

// @desc    Get the current meal plan (rolling window — strip past days)
// @route   GET /api/meal-plan/current
const getCurrentMealPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetCalories = calculateTDEE(user);

    const plan = await MealPlan.findOne({ user: req.user._id });
    if (!plan) {
      return res.json({ plan: null, targetCalories });
    }

    // Strip past days (keep today and future)
    const todayStr = new Date().toISOString().split('T')[0];
    const futureDays = plan.days.filter(d => {
      const dayStr = new Date(d.date).toISOString().split('T')[0];
      return dayStr >= todayStr;
    });

    // If we stripped some days, update the DB
    if (futureDays.length !== plan.days.length) {
      plan.days = futureDays;
      await plan.save();
    }

    res.json({ plan: { ...plan.toObject(), days: futureDays }, targetCalories });
  } catch (error) {
    console.error('Get Current Meal Plan Error:', error);
    res.status(500).json({ message: 'Failed to fetch meal plan.' });
  }
};

// @desc    Get AI suggestion for a food replacement (does NOT mutate DB)
// @route   POST /api/meal-plan/suggest-replacement
const suggestReplacement = async (req, res) => {
  try {
    const { foodName, calories, protein, carbs, fats, mealType } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const prompt = `You are a nutritionist. A user in ${user.location || 'UAE'} wants to replace "${foodName}" in their ${mealType || 'meal'}.
Reason: Not available in their area.

The original item had: ${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fats}g fats.

Suggest ONE replacement food that:
1. Is commonly available in ${user.location || 'UAE'}
2. Has similar macros (within 15% tolerance)
3. Respects these dietary restrictions: ${user.restrictions?.join(', ') || 'None'}

Return ONLY valid JSON — no markdown, no explanation:
{"foodName": "...", "calories": <number>, "protein": <number>, "carbs": <number>, "fats": <number>}`;

    const response = await getCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    let suggestion;
    try {
      suggestion = JSON.parse(raw);
    } catch (e) {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) suggestion = JSON.parse(match[1]);
      else throw new Error('AI returned invalid JSON');
    }

    res.json({ suggestion });
  } catch (error) {
    console.error('Suggest Replacement Error:', error);
    res.status(500).json({ message: 'AI suggestion service is temporarily unavailable.' });
  }
};

// @desc    Commit a food replacement into the saved plan (AI or manual)
// @route   POST /api/meal-plan/commit-replacement
const commitReplacement = async (req, res) => {
  try {
    const { dayDate, mealType, foodIndex, newFood } = req.body;
    // newFood = { foodName, calories, protein, carbs, fats }

    const whitelistedMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
    if (!whitelistedMealTypes.includes(mealType)) {
      return res.status(400).json({ message: 'Invalid mealType. Permitted values are Breakfast, Lunch, Dinner, Snacks.' });
    }

    if (!newFood || !newFood.foodName) {
      return res.status(400).json({ message: 'newFood with foodName is required.' });
    }

    const plan = await MealPlan.findOne({ user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'No saved meal plan found. Save your plan first.' });

    const dayPlan = plan.days.find(d => new Date(d.date).toISOString().split('T')[0] === dayDate);
    if (!dayPlan) return res.status(404).json({ message: 'Day not found in plan' });

    const mealItems = dayPlan.meals[mealType];
    if (!mealItems || !mealItems[foodIndex]) return res.status(404).json({ message: 'Food item not found at that index' });

    // Replace the item
    mealItems[foodIndex] = {
      foodName: newFood.foodName,
      calories: Number(newFood.calories) || 0,
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fats: Number(newFood.fats) || 0,
      status: 'active'
    };

    // Recalculate day total
    let dayTotal = 0;
    ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].forEach(mt => {
      dayPlan.meals[mt]?.forEach(item => { dayTotal += item.calories || 0; });
    });
    dayPlan.totalCalories = dayTotal;

    plan.markModified('days');
    await plan.save();

    res.json({ updatedDay: dayPlan });
  } catch (error) {
    console.error('Commit Replacement Error:', error);
    res.status(500).json({ message: 'Failed to commit replacement.' });
  }
};

export { generateMealPlan, saveMealPlan, getCurrentMealPlan, suggestReplacement, commitReplacement };

