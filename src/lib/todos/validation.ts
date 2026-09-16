import { z } from "zod";

export const TODO_TITLE_MAX_LENGTH = 200;

export const todoTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(TODO_TITLE_MAX_LENGTH, `Title must be at most ${TODO_TITLE_MAX_LENGTH} characters`);

/** 'YYYY-MM-DD', matching the habits domain's date-string convention. */
export const todoDueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date");

/** 'HH:mm', 24-hour. Only meaningful alongside a due date. */
export const todoDueTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid due time");
