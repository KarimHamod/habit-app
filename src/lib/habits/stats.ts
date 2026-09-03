import { addDays, compareDateStrings } from "@/lib/dates/date-string";

import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateRangeCompletion,
} from "./streak";
import type { HabitCompletionRecord, ScheduledHabit } from "./types";

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalCompletions: number;
  thisMonth: { completed: number; scheduled: number; rate: number };
  trend: { thisMonthRate: number; lastMonthRate: number; delta: number };
}

/** The calendar-month range containing `date`, as ['YYYY-MM-01', last day of month]. */
export function monthRange(date: string): { start: string; end: string } {
  const [year, month] = date.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthStart =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end: addDays(nextMonthStart, -1) };
}

function monthCompletionRate(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  monthStart: string,
  monthEnd: string,
  today: string,
  weekStartsOn: 0 | 1,
): { completed: number; scheduled: number; rate: number } {
  const clampedEnd = compareDateStrings(monthEnd, today) > 0 ? today : monthEnd;
  if (compareDateStrings(monthStart, clampedEnd) > 0) {
    return { completed: 0, scheduled: 0, rate: 0 };
  }
  return calculateRangeCompletion(
    habit,
    completions,
    monthStart,
    clampedEnd,
    weekStartsOn,
  );
}

export function calculateHabitStats(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  today: string,
  weekStartsOn: 0 | 1 = 1,
): HabitStats {
  const totalCompletions = completions.filter((c) => c.completed).length;

  const thisMonthRangeFull = monthRange(today);
  const thisMonth = monthCompletionRate(
    habit,
    completions,
    thisMonthRangeFull.start,
    thisMonthRangeFull.end,
    today,
    weekStartsOn,
  );

  const lastMonthAnchor = addDays(thisMonthRangeFull.start, -1);
  const lastMonthRangeFull = monthRange(lastMonthAnchor);
  const lastMonth = monthCompletionRate(
    habit,
    completions,
    lastMonthRangeFull.start,
    lastMonthRangeFull.end,
    today,
    weekStartsOn,
  );

  return {
    currentStreak: calculateCurrentStreak(
      habit,
      completions,
      today,
      weekStartsOn,
    ),
    longestStreak: calculateLongestStreak(
      habit,
      completions,
      today,
      weekStartsOn,
    ),
    completionRate: calculateRangeCompletion(
      habit,
      completions,
      habit.startDate,
      today,
      weekStartsOn,
    ).rate,
    totalCompletions,
    thisMonth,
    trend: {
      thisMonthRate: thisMonth.rate,
      lastMonthRate: lastMonth.rate,
      delta: thisMonth.rate - lastMonth.rate,
    },
  };
}
