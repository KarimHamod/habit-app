import { z } from "zod";

export const REFLECTION_MAX_LENGTH = 2000;

export const reflectionSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  body: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(
      REFLECTION_MAX_LENGTH,
      `Reflection must be at most ${REFLECTION_MAX_LENGTH} characters`,
    ),
});

export type ReflectionInput = z.infer<typeof reflectionSchema>;
