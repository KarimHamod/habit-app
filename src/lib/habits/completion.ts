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

/** Parses a direct-entry amount input; `null` for anything not a finite, non-negative number. */
export function parseAmountInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Quick-add preset amounts scaled to a habit's target (quarter/half/full),
 * deduplicated and sorted — e.g. target 60 -> [15, 30, 60]. Empty for a
 * habit with no positive target, since there's nothing sensible to scale to.
 */
export function buildQuickAddPresets(
  target: number | null | undefined,
): number[] {
  if (!target || target <= 0) return [];
  const raw = [target / 4, target / 2, target];
  const rounded = raw.map((n) => Math.round(n * 100) / 100);
  return Array.from(new Set(rounded)).sort((a, b) => a - b);
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
