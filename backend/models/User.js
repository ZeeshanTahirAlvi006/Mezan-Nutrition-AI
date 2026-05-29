import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().nullish(),
  weight: z.number().nullish(),
  height: z.number().nullish(),
  healthGoals: z.enum(['Weight Loss', 'Muscle Gain', 'Maintenance']).default('Maintenance'),
  restrictions: z.array(z.string()).default([]),
  location: z.string().default('UAE'),
  streakCount: z.number().default(0),
  role: z.enum(['user', 'admin']).default('user'),
  isDisabled: z.boolean().default(false),
  pantry: z.array(z.string()).default([]),
  targetCalories: z.number().default(2000),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional()
});

export const validateUser = (data) => {
  return UserSchema.parse(data);
};
