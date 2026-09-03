export type HabitType = "boolean" | "quantity" | "duration";
export type FrequencyType = "daily" | "weekly" | "specific_days" | "custom";

export interface HabitScheduleInfo {
  daysOfWeek: number[] | null;
  timesPerPeriod: number | null;
}

/**
 * A schedule as it actually applied over a span of time. `effectiveUntil:
 * null` marks the current, still-open version. Versions for a given habit
 * never overlap and never gap — together they cover [habit.startDate, ...).
 */
export interface ScheduleVersion {
  frequencyType: FrequencyType;
  schedule: HabitScheduleInfo | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

/**
 * The minimal shape the schedule/streak engine needs — not a full DB row.
 * `versions` lets past dates be evaluated under the schedule that actually
 * governed them, so editing a habit's frequency never rewrites how earlier
 * completions read against the schedule that was live at the time.
 */
export interface ScheduledHabit {
  startDate: string;
  endDate: string | null;
  versions: ScheduleVersion[];
}

export interface HabitCompletionRecord {
  date: string;
  completed: boolean;
  value: number | null;
}

export interface TodayHabit {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: HabitType;
  target: number | null;
  unit: string | null;
  completed: boolean;
  value: number | null;
  progress: number;
  currentStreak: number;
}
