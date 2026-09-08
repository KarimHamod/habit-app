import { z } from "zod";

export const challengeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  durationDays: z.coerce
    .number()
    .int("Duration must be a whole number of days")
    .min(1, "Duration must be at least 1 day")
    .max(365, "Duration must be at most 365 days"),
  habitIds: z
    .array(z.string().uuid())
    .min(1, "Pick at least one habit"),
});

export type ChallengeInput = z.infer<typeof challengeSchema>;
