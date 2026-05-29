import { z } from 'zod';

export const CheckInSchema = z.object({
  userId: z.string(),
  date: z.union([z.string(), z.date()]),
  mood: z.string().optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  satiety: z.number().min(1).max(10).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const validateCheckIn = (data) => {
  return CheckInSchema.parse(data);
};
