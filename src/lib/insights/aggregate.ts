import {
  addDays,
  compareDateStrings,
  enumerateDates,
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

export interface CompletionSummary {
  scheduled: number;
  completed: number;
  rate: number;
}

/** Scheduled/completed occurrences summed across every habit in the range, plus the resulting rate — the basis for every aggregate percentage on the page. */
export function aggregateCompletionSummary(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: 0 | 1 = 1,
): CompletionSummary {
  if (compareDateStrings(rangeStart, rangeEnd) > 0) {
    return { scheduled: 0, completed: 0, rate: 0 };
  }

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

  return {
    scheduled: totalScheduled,
    completed: totalCompleted,
    rate: totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0,
  };
}

/** Completed / scheduled occurrences summed across every habit in the range — the basis for every aggregate percentage on the page. */
export function aggregateCompletionRate(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: 0 | 1 = 1,
): number {
  return aggregateCompletionSummary(habits, rangeStart, rangeEnd, weekStartsOn)
    .rate;
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

export interface DailyFlowPoint {
  date: string;
  scheduled: number;
  completed: number;
}

/** Scheduled/completed counts across every habit for a single day. */
function sumDailyCompletion(
  habits: HabitWithHistory[],
  date: string,
  weekStartsOn: 0 | 1,
): { scheduled: number; completed: number } {
  let scheduled = 0;
  let completed = 0;
  for (const habit of habits) {
    const range = calculateRangeCompletion(
      habit.schedule,
      habit.completions,
      date,
      date,
      weekStartsOn,
    );
    scheduled += range.scheduled;
    completed += range.completed;
  }
  return { scheduled, completed };
}

/**
 * Per-day scheduled/completed counts across every habit, for the 7 days of
 * the current week (Sun/Mon start through the following Sat/Sun). Days after
 * `today` haven't happened yet, so they read as zero/zero rather than
 * "missed" — there's nothing to report until the day arrives.
 */
export function buildWeeklyFlow(
  habits: HabitWithHistory[],
  today: string,
  weekStartsOn: 0 | 1,
): DailyFlowPoint[] {
  const weekStart = getWeekStart(today, weekStartsOn);

  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(
    (date) => {
      if (compareDateStrings(date, today) > 0) {
        return { date, scheduled: 0, completed: 0 };
      }
      return { date, ...sumDailyCompletion(habits, date, weekStartsOn) };
    },
  );
}

/**
 * Per-day scheduled/completed counts across every habit, for every day in
 * [rangeStart, rangeEnd] inclusive — the basis for the year-long completion
 * heatmap. Unlike buildWeeklyFlow, this has no notion of "today"; the caller
 * decides the range (typically ending today, since there's nothing to show
 * for days that haven't happened yet).
 */
export function buildCompletionHeatmap(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: 0 | 1,
): DailyFlowPoint[] {
  return enumerateDates(rangeStart, rangeEnd).map((date) => ({
    date,
    ...sumDailyCompletion(habits, date, weekStartsOn),
  }));
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
 * Each habit's completion rate over an explicit [rangeStart, rangeEnd] date
 * range, plus its current streak (always relative to `today`, independent
 * of the range), sorted best-first. The shared basis for both
 * rankHabitPerformance (a rolling window ending today) and any fixed-window
 * use (e.g. a challenge's [start_date, end_date]).
 */
export function rankHabitPerformanceInRange(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  today: string,
  weekStartsOn: 0 | 1,
): HabitPerformance[] {
  return habits
    .map((habit) => {
      const { scheduled, rate } = calculateRangeCompletion(
        habit.schedule,
        habit.completions,
        rangeStart,
        rangeEnd,
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
  return rankHabitPerformanceInRange(
    habits,
    rangeStart,
    today,
    today,
    weekStartsOn,
  );
}
