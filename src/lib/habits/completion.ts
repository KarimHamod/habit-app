import type { HabitType } from "./types";

/** Progress is always clamped to [0, 100] — a value exceeding target never overflows the bar. */
export function calculateHabitProgress(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

export interface CompletionInput {
  type: HabitType;
  value?: number;
  target?: number | null;
}

export interface CompletionPayload {
  completed: boolean;
  value: number;
}

export interface CompletionError {
  error: string;
}

/**
 * Shapes and validates a completion write without touching the database —
 * kept pure so it's unit-testable. For quantity/duration habits, `completed`
 * reflects whether the logged value has reached target, not merely that a
 * value was logged — a partial glass of water isn't "done" for the day.
 */
export function buildCompletionPayload({
  type,
  value,
  target,
}: CompletionInput): CompletionPayload | CompletionError {
  if (type === "boolean") {
    return { completed: true, value: 1 };
  }

  if (value === undefined || value === null || Number.isNaN(value)) {
    return { error: "A value is required for this habit" };
  }

  if (value < 0) {
    return { error: "Value must be zero or greater" };
  }

  return {
    completed: target != null && target > 0 ? value >= target : true,
    value,
  };
}
