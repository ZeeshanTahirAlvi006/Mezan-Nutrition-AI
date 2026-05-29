import { z } from 'zod';

export const EmbeddedFoodItemSchema = z.object({
  foodId: z.string().nullable().optional(), // Reference if needed
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  servings: z.number().default(1)
});

export const DailyLogSchema = z.object({
  userId: z.string(),
  date: z.union([z.string(), z.date()]),
  foodItems: z.array(EmbeddedFoodItemSchema).default([]),
  totals: z.object({
    calories: z.number().default(0),
    protein: z.number().default(0),
    carbs: z.number().default(0),
    fats: z.number().default(0)
  }).default({ calories: 0, protein: 0, carbs: 0, fats: 0 }),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional()
});

export const validateDailyLog = (data) => {
  return DailyLogSchema.parse(data);
};
