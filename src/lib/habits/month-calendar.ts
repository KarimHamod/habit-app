import { compareDateStrings, enumerateDates } from "@/lib/dates/date-string";

import { isHabitScheduledOnDate, resolveVersionAt } from "./schedule";
import type { HabitCompletionRecord, ScheduledHabit } from "./types";

export type DayAggregateStatus =
  "complete" | "partial" | "missed" | "none-scheduled" | "future";

export interface DayHabitEntry {
  habitId: string;
  name: string;
  color: string | null;
  completed: boolean;
}

export interface MonthCalendarDay {
  date: string;
  status: DayAggregateStatus;
  habits: DayHabitEntry[];
}

export interface HabitForCalendar {
  id: string;
  name: string;
  color: string | null;
  schedule: ScheduledHabit;
  completions: HabitCompletionRecord[];
}

/**
 * Aggregates every habit's status per day across a date range — the basis
 * for the Calendar page's dots and its selected-day breakdown. A day is
 * "complete" only when every habit scheduled that day was completed;
 * "partial" when some were; "missed" when none were (but something was
 * scheduled); "none-scheduled" when nothing was due; "future" beyond today
 * regardless of what's scheduled, so upcoming days never look like misses.
 * A "weekly" (N-times-per-week) habit has no fixed per-day expectation, so
 * it only contributes to a day when it was actually completed that day —
 * an untouched day never counts against it (whether the week's target was
 * hit belongs to the streak/rate math, not a single day).
 */
export function buildMonthCalendar(
  habits: HabitForCalendar[],
  rangeStart: string,
  rangeEnd: string,
  today: string,
): MonthCalendarDay[] {
  return enumerateDates(rangeStart, rangeEnd).map((date) => {
    const isFuture = compareDateStrings(date, today) > 0;

    const dayHabits: DayHabitEntry[] = [];
    for (const habit of habits) {
      if (!isHabitScheduledOnDate(habit.schedule, date)) continue;
      const completed = habit.completions.some(
        (c) => c.date === date && c.completed,
      );
      const isWeekly =
        resolveVersionAt(habit.schedule, date)?.frequencyType === "weekly";
      if (isWeekly && !completed) continue;
      dayHabits.push({
        habitId: habit.id,
        name: habit.name,
        color: habit.color,
        completed,
      });
    }

    let status: DayAggregateStatus;
    if (isFuture) {
      status = "future";
    } else if (dayHabits.length === 0) {
      status = "none-scheduled";
    } else {
      const completedCount = dayHabits.filter((h) => h.completed).length;
      status =
        completedCount === dayHabits.length
          ? "complete"
          : completedCount === 0
            ? "missed"
            : "partial";
    }

    return { date, status, habits: dayHabits };
  });
}
