import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

// Native <input type="date"/"time"> elements report an empty value as "",
// not undefined — without this, an untouched optional field fails its
// format regex instead of being treated as absent.
function optionalFromEmptyString<T extends z.ZodTypeAny>(schema: T) {
  return z
    .union([schema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));
}

export const habitTypeSchema = z.enum(["boolean", "quantity", "duration"]);
export const frequencyTypeSchema = z.enum([
  "daily",
  "weekly",
  "specific_days",
  "custom",
]);

export const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name is too long"),
    description: z
      .string()
      .trim()
      .max(500, "Description is too long")
      .optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    type: habitTypeSchema,
    target: z.coerce
      .number()
      .positive("Target must be greater than zero")
      .optional(),
    unit: z.string().trim().max(30, "Unit is too long").optional(),
    frequencyType: frequencyTypeSchema,
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    timesPerPeriod: z.coerce.number().int().positive().optional(),
    startDate: dateStringSchema,
    endDate: optionalFromEmptyString(dateStringSchema),
    reminderEnabled: z.boolean(),
    reminderTime: optionalFromEmptyString(
      z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
    ),
  })
  .refine((data) => data.type === "boolean" || data.target !== undefined, {
    message: "Target is required for quantity and duration habits",
    path: ["target"],
  })
  .refine(
    (data) =>
      data.frequencyType !== "specific_days" ||
      (data.daysOfWeek?.length ?? 0) > 0,
    { message: "Select at least one day", path: ["daysOfWeek"] },
  )
  .refine(
    (data) => data.frequencyType !== "weekly" || (data.timesPerPeriod ?? 0) > 0,
    { message: "Choose how many times per week", path: ["timesPerPeriod"] },
  )
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type HabitInput = z.infer<typeof habitSchema>;
