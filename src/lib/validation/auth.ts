import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  timezone: z.string().min(1, "Timezone is required"),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
