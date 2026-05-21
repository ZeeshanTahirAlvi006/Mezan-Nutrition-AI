import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import FoodItem from '../models/FoodItem.js';

// --- Clients Initialization ---
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || 'dummy_key' });

const groqClient = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || 'dummy_key'
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || 'dummy_key'
);

const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key',
});

/**
 * @desc Robust wrapper that cycles through MULTIPLE PROVIDERS if one hits a rate limit (429) or fails.
 */
const getCompletionWithFallback = async (params) => {
  const { messages, response_format, tools } = params;

  const providers = [
    { name: 'mistral', model: 'mistral-small-latest' },
    { name: 'groq', model: 'llama-3.3-70b-versatile' },
    { name: 'gemini', model: 'gemini-1.5-flash' },
    { name: 'openrouter', model: 'google/gemini-2.0-flash-001' }
  ];

  let lastError;

  for (const provider of providers) {
    try {
      console.log(`[AI Service] Attempting completion with provider: ${provider.name} (${provider.model})`);

      if (provider.name === 'mistral') {
        const res = await mistralClient.chat.complete({
          model: provider.model,
          messages,
          response_format,
          tools
        });
        return res;
      }

      if (provider.name === 'groq') {
        const res = await groqClient.chat.completions.create({
          model: provider.model,
          messages,
          response_format: response_format?.type === 'json_object' ? { type: 'json_object' } : undefined,
          // Groq tools support is similar to OpenAI
          tools: tools
        });
        // Map Groq/OpenAI response to Mistral-like structure for consistency
        return {
          choices: [{
            message: res.choices[0].message
          }]
        };
      }

      if (provider.name === 'gemini') {
        const model = genAI.getGenerativeModel({ model: provider.model });
        // Map messages to Gemini format (user/model)
        const history = messages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        const chat = model.startChat({ history });
        const lastMsg = messages[messages.length - 1].content;
        
        const result = await chat.sendMessage(lastMsg);
        const text = result.response.text();
        
        return {
          choices: [{
            message: { role: 'assistant', content: text }
          }]
        };
      }

      if (provider.name === 'openrouter') {
        const res = await openRouterClient.chat.completions.create({
          model: provider.model,
          messages,
          response_format: response_format?.type === 'json_object' ? { type: 'json_object' } : undefined,
        });
        return {
          choices: [{
            message: res.choices[0].message
          }]
        };
      }

    } catch (error) {
      console.error(`[AI Service] Provider ${provider.name} failed:`, error.message);
      lastError = error;
      
      // If rate limited or service unavailable, try next
      if (error.status === 429 || error.statusCode === 429 || error.status === 503 || error.status === 500) {
        console.warn(`[AI Service] ${provider.name} is struggling. Switching to next provider...`);
        continue;
      }
      // If it's a validation error or something else, we might want to stop, but for now let's try fallback anyway
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed.");
};

// @desc Generate Chat Response
const generateChatResponse = async (user, messages) => {
  try {
    const systemPrompt = `You are an expert nutritionist for Antigravity.
Your goal is to provide accurate, helpful, and concise nutritional advice.
Tailor all recommendations to Location: ${user.location || 'UAE'}.
User Profile: ${user.healthGoals || 'Maintenance'}, Restrictions: ${user.restrictions?.join(', ') || 'None'}.
Available Items at User's Home (Pantry): ${user.pantry?.length > 0 ? user.pantry.join(', ') : 'None specified yet'}.
Keep these available home items in mind when recommending meals, recipes, or ingredients. Try to suggest dishes that use these items to reduce food waste and make cooking convenient for them.
You have access to tools:
1. search_food_database: Use this to find nutrition data for specific foods.
2. get_user_food_logs: Use this to see what the user has actually eaten. You can fetch logs for today or any specific date.
When asked about what the user ate or their progress, use get_user_food_logs. Use Markdown tables for data.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "search_food_database",
          description: "Search for macros of a food item",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "get_user_food_logs",
          description: "Get the user's food log for a specific date (defaults to today)",
          parameters: {
            type: "object",
            properties: {
              date: { 
                type: "string", 
                description: "The date to fetch logs for in YYYY-MM-DD format. Defaults to today if not provided." 
              },
            },
          },
        }
      }
    ];

    const response = await getCompletionWithFallback({
      messages: fullMessages,
      tools: tools,
    });

    return response.choices[0].message;

  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Failed to generate AI response.");
  }
};

export { generateChatResponse, getCompletionWithFallback };
