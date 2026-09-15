import { z } from "zod";

export const TODO_TITLE_MAX_LENGTH = 200;

export const todoTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(TODO_TITLE_MAX_LENGTH, `Title must be at most ${TODO_TITLE_MAX_LENGTH} characters`);
