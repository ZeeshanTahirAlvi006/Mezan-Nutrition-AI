import { z } from 'zod';

export const MealItemSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  status: z.enum(['active', 'replaced']).default('active')
});

export const DailyPlanSchema = z.object({
  date: z.union([z.string(), z.date()]),
  totalCalories: z.number(),
  meals: z.object({
    Breakfast: z.array(MealItemSchema).default([]),
    Lunch: z.array(MealItemSchema).default([]),
    Dinner: z.array(MealItemSchema).default([]),
    Snacks: z.array(MealItemSchema).default([])
  })
});

export const MealPlanSchema = z.object({
  userId: z.string(), // Firebase UID or Firestore doc ID
  days: z.array(DailyPlanSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const validateMealPlan = (data) => {
  return MealPlanSchema.parse(data);
};
