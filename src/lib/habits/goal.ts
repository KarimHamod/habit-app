import { compareDateStrings } from "@/lib/dates/date-string";

import type { HabitCompletionRecord } from "./types";

export interface GoalInput {
  target: number;
  startDate: string;
  endDate: string;
}

export interface GoalProgress {
  current: number;
  target: number;
  progress: number;
}

/**
 * Sums completion values within the goal's window — `value` already carries
 * the right unit per habit type (1 per occurrence for boolean habits, an
 * amount for quantity/duration habits), so this stays generic across goal
 * types ("25 completions", "50 km", "20 hours") without a type discriminator.
 */
export function calculateGoalProgress(
  goal: GoalInput,
  completions: HabitCompletionRecord[],
): GoalProgress {
  const current = completions
    .filter(
      (c) =>
        c.completed &&
        compareDateStrings(c.date, goal.startDate) >= 0 &&
        compareDateStrings(c.date, goal.endDate) <= 0,
    )
    .reduce((sum, c) => sum + (c.value ?? 1), 0);

  const progress =
    goal.target > 0
      ? Math.min(100, Math.max(0, (current / goal.target) * 100))
      : 0;

  return { current, target: goal.target, progress };
}
