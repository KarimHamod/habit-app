import { compareDateStrings, enumerateDates } from "@/lib/dates/date-string";

import { isHabitScheduledOnDate, resolveVersionAt } from "./schedule";
import type { HabitCompletionRecord, ScheduledHabit } from "./types";

export type DayStatus = "completed" | "missed" | "unscheduled" | "future";

export interface CalendarDay {
  date: string;
  status: DayStatus;
}

/**
 * Per-day status for a date range — the shared basis for both the habit
 * detail page's mini calendar and the full Calendar page. A day is "missed"
 * only if it was actually scheduled and is in the past; days beyond today
 * are "future" regardless of schedule, so they never look like misses. A
 * "weekly" (N-times-per-week) habit has no fixed per-day expectation — any
 * day in range is eligible, but only the ones actually done are marked;
 * whether the week's target was hit belongs to the streak/rate math, not a
 * single day, so an untouched day for a weekly habit reads as "unscheduled"
 * rather than a false "missed".
 */
export function getCalendarDays(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  rangeStart: string,
  rangeEnd: string,
  today: string,
): CalendarDay[] {
  const completedDates = new Set(
    completions.filter((c) => c.completed).map((c) => c.date),
  );

  return enumerateDates(rangeStart, rangeEnd).map((date) => {
    if (compareDateStrings(date, today) > 0) {
      return { date, status: "future" as const };
    }
    if (!isHabitScheduledOnDate(habit, date)) {
      return { date, status: "unscheduled" as const };
    }
    if (completedDates.has(date)) {
      return { date, status: "completed" as const };
    }
    return {
      date,
      status:
        resolveVersionAt(habit, date)?.frequencyType === "weekly"
          ? ("unscheduled" as const)
          : ("missed" as const),
    };
  });
}
