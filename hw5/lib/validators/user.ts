import { z } from 'zod';

export const userIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{2,19}$/i, 'UserID must start with a letter and be 3-20 chars')
  .transform((s) => s.toLowerCase());

export type UserIdInput = z.infer<typeof userIdSchema>;









