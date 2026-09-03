import {
  addDays,
  compareDateStrings,
  getWeekStart,
} from "@/lib/dates/date-string";
import {
  calculateCurrentStreak,
  calculateRangeCompletion,
} from "@/lib/habits/streak";
import type { HabitCompletionRecord, ScheduledHabit } from "@/lib/habits/types";

export interface HabitWithHistory {
  id: string;
  name: string;
  color: string | null;
  schedule: ScheduledHabit;
  completions: HabitCompletionRecord[];
}

/** Completed / scheduled occurrences summed across every habit in the range — the basis for every aggregate percentage on the page. */
export function aggregateCompletionRate(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: 0 | 1 = 1,
): number {
  if (compareDateStrings(rangeStart, rangeEnd) > 0) return 0;

  let totalScheduled = 0;
  let totalCompleted = 0;

  for (const habit of habits) {
    const { scheduled, completed } = calculateRangeCompletion(
      habit.schedule,
      habit.completions,
      rangeStart,
      rangeEnd,
      weekStartsOn,
    );
    totalScheduled += scheduled;
    totalCompleted += completed;
  }

  return totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;
}

export interface WeeklyConsistencyPoint {
  weekStart: string;
  rate: number;
}

/** Aggregate completion rate per week for the last `weekCount` weeks, ending with the week containing `today`. */
export function buildWeeklyConsistency(
  habits: HabitWithHistory[],
  today: string,
  weekStartsOn: 0 | 1,
  weekCount: number,
): WeeklyConsistencyPoint[] {
  const currentWeekStart = getWeekStart(today, weekStartsOn);
  const points: WeeklyConsistencyPoint[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekEndFull = addDays(weekStart, 6);
    const weekEnd =
      compareDateStrings(weekEndFull, today) > 0 ? today : weekEndFull;
    points.push({
      weekStart,
      rate: aggregateCompletionRate(habits, weekStart, weekEnd, weekStartsOn),
    });
  }

  return points;
}

export interface HabitWeeklyChange {
  habitId: string;
  name: string;
  currentWeekRate: number;
  previousWeekRate: number;
  delta: number;
}

/** Each habit's completion rate this week vs the week before, for surfacing "biggest improvement" / "biggest decline". */
export function rankWeeklyChange(
  habits: HabitWithHistory[],
  weekStart: string,
  weekEnd: string,
  previousWeekStart: string,
  previousWeekEnd: string,
  weekStartsOn: 0 | 1 = 1,
): HabitWeeklyChange[] {
  return habits
    .map((habit) => {
      const currentWeekRate = aggregateCompletionRate(
        [habit],
        weekStart,
        weekEnd,
        weekStartsOn,
      );
      const previousWeekRate = aggregateCompletionRate(
        [habit],
        previousWeekStart,
        previousWeekEnd,
        weekStartsOn,
      );
      return {
        habitId: habit.id,
        name: habit.name,
        currentWeekRate,
        previousWeekRate,
        delta: currentWeekRate - previousWeekRate,
      };
    })
    .sort((a, b) => b.delta - a.delta);
}

export interface HabitPerformance {
  habitId: string;
  name: string;
  color: string | null;
  rate: number;
  currentStreak: number;
  /** Occurrences actually scheduled in the ranking window — 0 means the rate has no meaningful basis yet (e.g. a habit created today). */
  scheduledCount: number;
}

/**
 * Each habit's completion rate over a trailing window (default: last 30
 * days) and current streak, sorted best-first. Deliberately a rolling
 * window rather than "this calendar month" — on day 1 of a new month a
 * month-to-date rate would be nearly empty (0% or 100% off a single day),
 * making the ranking meaningless right when someone opens the page.
 */
export function rankHabitPerformance(
  habits: HabitWithHistory[],
  today: string,
  weekStartsOn: 0 | 1,
  windowDays = 30,
): HabitPerformance[] {
  const rangeStart = addDays(today, -(windowDays - 1));

  return habits
    .map((habit) => {
      const { scheduled, rate } = calculateRangeCompletion(
        habit.schedule,
        habit.completions,
        rangeStart,
        today,
        weekStartsOn,
      );
      const currentStreak = calculateCurrentStreak(
        habit.schedule,
        habit.completions,
        today,
        weekStartsOn,
      );
      return {
        habitId: habit.id,
        name: habit.name,
        color: habit.color,
        rate,
        currentStreak,
        scheduledCount: scheduled,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}
