import dotenv from 'dotenv';
dotenv.config();

import { generateChatResponse } from './services/aiService.js';

async function test() {
  const mockUser = {
    location: 'Lahore, Pakistan',
    healthGoals: 'Lose Weight',
    age: 25,
    weight: 75,
    height: 175,
    restrictions: ['none'],
    targetCalories: 1800
  };

  // Mock a history where the AI returned a tool call and the user returned the tool result
  const messages = [
    {
      role: 'user',
      content: 'What did I eat today?'
    },
    {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'get_user_food_logs',
            arguments: '{"date":"2026-05-25"}'
          }
        }
      ]
    },
    {
      role: 'tool',
      tool_call_id: 'call_123',
      name: 'get_user_food_logs',
      content: JSON.stringify({
        date: 'Monday, May 25, 2026',
        foods: [
          { name: 'Burrito Supreme', servings: 1, calories: 420, protein: 20, carbs: 45, fats: 15 }
        ],
        totals: { calories: 420, protein: 20, carbs: 45, fats: 15 }
      })
    }
  ];

  try {
    console.log("Calling generateChatResponse with mock history...");
    const response = await generateChatResponse(mockUser, messages);
    console.log("SUCCESS! Response received:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("FAILED with error:", err);
  }
}

test();
