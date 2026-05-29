import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { getWeatherByLocation, getWeatherCached, weatherCache, CACHE_DURATION } from './weatherService.js';
import { buildTools } from './aiTools.js';
import { buildSystemPrompt, buildWeatherContext } from './aiPrompt.js';

// ─────────────────────────────────────────────
//  CLIENT INITIALIZATION
// ─────────────────────────────────────────────

const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || 'dummy_key',
});

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || 'dummy_key'
);

const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key',
});

// ─────────────────────────────────────────────
//  MULTI-PROVIDER FALLBACK WRAPPER
// ─────────────────────────────────────────────

const withTimeout = (promise, ms, providerName) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Request timed out after ${ms}ms`);
      error.status = 408; // Request Timeout
      reject(error);
    }, ms);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
};

/**
 * Cycles through providers in order.
 * On 429 / 500 / 503 / 408 (Timeout), automatically moves to the next one.
 */
const getCompletionWithFallback = async (params) => {
  const { messages, response_format, tools } = params;

  const hasImage = messages.some((m) => Array.isArray(m.content));

  let providers = [
    { name: 'mistral', model: 'mistral-small-latest' },
    { name: 'groq', model: 'llama-3.3-70b-versatile' },
    { name: 'gemini', model: 'gemini-1.5-flash' },
    { name: 'openrouter', model: 'google/gemini-2.0-flash-001' },
  ];

  if (hasImage) {
    console.log('[AI Service] Image detected → routing to vision provider (openrouter).');
    providers = [{ name: 'openrouter', model: 'google/gemini-2.0-flash-001' }];
  }

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[AI Service] Trying ${provider.name} (${provider.model})…`);

      // ── Mistral ──────────────────────────────
      if (provider.name === 'mistral') {
        const mistralMessages = messages.map(m => {
          const mapped = { role: m.role };
          
          if (m.content !== undefined && m.content !== null && m.content !== '') {
            mapped.content = m.content;
          } else if (m.role === 'assistant') {
            mapped.content = null; // Normalize empty assistant content to null
          } else {
            mapped.content = '';
          }

          if (m.tool_calls) {
            mapped.toolCalls = m.tool_calls.map(tc => ({
              id: tc.id,
              type: tc.type || 'function',
              function: tc.function
            }));
          }

          if (m.tool_call_id) {
            mapped.toolCallId = m.tool_call_id;
            mapped.name = m.name;
          }

          return mapped;
        });

        const res = await withTimeout(
          mistralClient.chat.complete({
            model: provider.model,
            messages: mistralMessages,
            response_format,
            tools,
          }),
          8000,
          'mistral'
        );
        return res;
      }

      // ── Groq ─────────────────────────────────
      if (provider.name === 'groq') {
        const res = await withTimeout(
          groqClient.chat.completions.create({
            model: provider.model,
            messages,
            response_format:
              response_format?.type === 'json_object'
                ? { type: 'json_object' }
                : undefined,
            tools,
          }),
          8000,
          'groq'
        );
        return { choices: [{ message: res.choices[0].message }] };
      }

      // ── Gemini ───────────────────────────────
      if (provider.name === 'gemini') {
        const model = genAI.getGenerativeModel({ model: provider.model });
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const chat = model.startChat({ history });
        const lastMsg = messages[messages.length - 1].content;
        
        const text = await withTimeout(
          (async () => {
            const result = await chat.sendMessage(lastMsg);
            return result.response.text();
          })(),
          8000,
          'gemini'
        );
        return { choices: [{ message: { role: 'assistant', content: text } }] };
      }

      // ── OpenRouter ───────────────────────────
      if (provider.name === 'openrouter') {
        const res = await withTimeout(
          openRouterClient.chat.completions.create({
            model: provider.model,
            messages,
            response_format:
              response_format?.type === 'json_object'
                ? { type: 'json_object' }
                : undefined,
            tools,
          }),
          8000,
          'openrouter'
        );
        return { choices: [{ message: res.choices[0].message }] };
      }
    } catch (error) {
      console.error(`[AI Service] ${provider.name} failed: ${error.message}`);
      lastError = error;
      const retryable = [408, 429, 500, 503];
      if (retryable.includes(error.status) || retryable.includes(error.statusCode)) {
        console.warn(`[AI Service] ${provider.name} is struggling → switching…`);
      }
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed.');
};

// ─────────────────────────────────────────────
//  MAIN EXPORT: generateChatResponse
// ─────────────────────────────────────────────

const generateChatResponse = async (user, messages) => {
  try {
    // ── 1. Fetch weather context (Stale-While-Revalidate to make it non-blocking!) ─────────────────
    let weatherContext = '';
    try {
      const location = user.location || 'UAE';
      const cachedWeather = getWeatherCached(location);
      
      if (cachedWeather) {
        weatherContext = buildWeatherContext(cachedWeather);
        // If the cache is expired, trigger background revalidation
        const normalizedKey = location.trim().toLowerCase();
        const cachedEntry = weatherCache[normalizedKey];
        if (cachedEntry && Date.now() - cachedEntry.timestamp >= CACHE_DURATION) {
          console.log(`[Weather Service] Background revalidating weather for "${location}"`);
          getWeatherByLocation(location).catch(err => console.error("Background weather fetch failed:", err.message));
        }
      } else {
        // Cache miss: Trigger background fetch so it's ready next time, do not block the chat response
        console.log(`[Weather Service] Cache miss, triggering background weather fetch for "${location}"`);
        getWeatherByLocation(location).catch(err => console.error("Background weather fetch failed:", err.message));
      }
    } catch (weatherErr) {
      console.error('[AI Service] Weather context failed:', weatherErr.message);
    }

    // ── 2. Calculate macro goals via Mifflin-St Jeor Formula ─────────────────
    const weight = Number(user.weight);
    const height = Number(user.height);
    const age = Number(user.age);
    const gender = (user.gender || 'female').toLowerCase();

    let bmr = 0;
    let calorieGoal = 2000;

    if (!isNaN(weight) && !isNaN(height) && !isNaN(age) && weight > 0 && height > 0 && age > 0) {
      if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }
      const activityFactor = 1.375; // Active/lightly active default
      const tdee = Math.round(bmr * activityFactor);
      const goal = (user.healthGoals || '').toLowerCase();
      
      if (goal.includes('lose') || goal.includes('cut') || goal.includes('deficit')) {
        calorieGoal = Math.max(1200, tdee - 400); // Safe 400 kcal fat loss deficit
      } else if (goal.includes('gain') || goal.includes('bulk')) {
        calorieGoal = tdee + 300;
      } else {
        calorieGoal = tdee;
      }
    } else if (user.targetCalories) {
      calorieGoal = user.targetCalories;
    }

    const proteinGoal = user.proteinGoal || Math.round((calorieGoal * 0.25) / 4); // 25% protein split (balanced vegetarian threshold)
    const carbsGoal = user.carbsGoal || Math.round((calorieGoal * 0.45) / 4);     // 45% carbs split
    const fatsGoal = user.fatsGoal || Math.round((calorieGoal * 0.30) / 9);       // 30% fats split
    const waterGoal = weight ? Math.round(weight * 35) : 2500;                  // 35ml per kg of bodyweight

    const goals = {
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatsGoal,
      waterGoal
    };

    // ── 3. Assemble messages ─────────────────────
    const systemPrompt = buildSystemPrompt(user, weatherContext, goals);
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // ── 4. Call AI with tools ────────────────────
    const response = await getCompletionWithFallback({
      messages: fullMessages,
      tools: buildTools(),
    });

    return response.choices[0].message;

  } catch (error) {
    console.error('[AI Service] generateChatResponse error:', error);
    throw new Error('Failed to generate AI response.');
  }
};

export { generateChatResponse, getCompletionWithFallback };