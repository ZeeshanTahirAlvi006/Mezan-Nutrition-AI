import { z } from 'zod';

export const FoodItemSchema = z.object({
  name: z.string(),
  country: z.string().default('Global'),
  calories: z.number(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fats: z.number().optional(),
  fiber: z.number().optional(),
  vitamin_A: z.number().optional(),
  vitamin_C: z.number().optional(),
  sodium: z.number().optional(),
  sugar: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const validateFoodItem = (data) => {
  return FoodItemSchema.parse(data);
};
