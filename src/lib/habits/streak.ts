import {
  addDays,
  compareDateStrings,
  getWeekStart,
} from "@/lib/dates/date-string";

import { getCurrentVersion, getScheduledDates, resolveVersionAt } from "./schedule";
import type { HabitCompletionRecord, ScheduledHabit } from "./types";

export interface RangeCompletion {
  scheduled: number;
  completed: number;
  rate: number;
}

function completedDateSet(
  completions: HabitCompletionRecord[],
  asOfDate: string,
): Set<string> {
  return new Set(
    completions
      .filter((c) => c.completed && compareDateStrings(c.date, asOfDate) <= 0)
      .map((c) => c.date),
  );
}

/**
 * Day-granular streak: walks scheduled occurrences (never unscheduled days)
 * backward from asOfDate. A scheduled-but-not-yet-done occurrence on
 * asOfDate itself doesn't break the streak — the day isn't over yet.
 */
function currentDayStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
): number {
  const completed = completedDateSet(completions, asOfDate);
  const scheduled = getScheduledDates(habit, habit.startDate, asOfDate);
  if (scheduled.length === 0) return 0;

  let index = scheduled.length - 1;
  if (scheduled[index] === asOfDate && !completed.has(asOfDate)) {
    index -= 1;
  }

  let streak = 0;
  for (; index >= 0; index--) {
    if (!completed.has(scheduled[index])) break;
    streak += 1;
  }
  return streak;
}

function longestDayStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
): number {
  const completed = completedDateSet(completions, asOfDate);
  const scheduled = getScheduledDates(habit, habit.startDate, asOfDate);

  let longest = 0;
  let current = 0;
  for (const date of scheduled) {
    if (completed.has(date)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function weeklyCompletionCounts(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
  weekStartsOn: 0 | 1,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of completions) {
    if (!c.completed) continue;
    if (compareDateStrings(c.date, asOfDate) > 0) continue;
    if (compareDateStrings(c.date, habit.startDate) < 0) continue;
    const week = getWeekStart(c.date, weekStartsOn);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return counts;
}

function weekRange(
  habit: ScheduledHabit,
  asOfDate: string,
  weekStartsOn: 0 | 1,
): string[] {
  const startWeek = getWeekStart(habit.startDate, weekStartsOn);
  const asOfWeek = getWeekStart(asOfDate, weekStartsOn);
  const weeks: string[] = [];
  for (
    let cursor = startWeek;
    compareDateStrings(cursor, asOfWeek) <= 0;
    cursor = addDays(cursor, 7)
  ) {
    weeks.push(cursor);
  }
  return weeks;
}

/**
 * The N-times-per-week target for a week, resolved from whichever schedule
 * version governed that week's start — a schedule change mid-week is
 * attributed to the whole week rather than split day-by-day, consistent
 * with weeks (not days) being the atomic scheduled unit for this frequency.
 */
function weeklyTargetFor(habit: ScheduledHabit, weekStart: string): number {
  return resolveVersionAt(habit, weekStart)?.schedule?.timesPerPeriod ?? 1;
}

/** Week-bucketed streak for flexible "N times per week" habits — a week counts once it hits timesPerPeriod. */
function currentWeeklyStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
  weekStartsOn: 0 | 1,
): number {
  const counts = weeklyCompletionCounts(
    habit,
    completions,
    asOfDate,
    weekStartsOn,
  );
  const weeks = weekRange(habit, asOfDate, weekStartsOn);
  if (weeks.length === 0) return 0;

  const asOfWeek = getWeekStart(asOfDate, weekStartsOn);
  let index = weeks.length - 1;
  if (
    weeks[index] === asOfWeek &&
    (counts.get(asOfWeek) ?? 0) < weeklyTargetFor(habit, asOfWeek)
  ) {
    index -= 1;
  }

  let streak = 0;
  for (; index >= 0; index--) {
    if ((counts.get(weeks[index]) ?? 0) < weeklyTargetFor(habit, weeks[index]))
      break;
    streak += 1;
  }
  return streak;
}

function longestWeeklyStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
  weekStartsOn: 0 | 1,
): number {
  const counts = weeklyCompletionCounts(
    habit,
    completions,
    asOfDate,
    weekStartsOn,
  );
  const weeks = weekRange(habit, asOfDate, weekStartsOn);

  let longest = 0;
  let current = 0;
  for (const week of weeks) {
    if ((counts.get(week) ?? 0) >= weeklyTargetFor(habit, week)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function calculateCurrentStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
  weekStartsOn: 0 | 1 = 1,
): number {
  return getCurrentVersion(habit)?.frequencyType === "weekly"
    ? currentWeeklyStreak(habit, completions, asOfDate, weekStartsOn)
    : currentDayStreak(habit, completions, asOfDate);
}

export function calculateLongestStreak(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  asOfDate: string,
  weekStartsOn: 0 | 1 = 1,
): number {
  return getCurrentVersion(habit)?.frequencyType === "weekly"
    ? longestWeeklyStreak(habit, completions, asOfDate, weekStartsOn)
    : longestDayStreak(habit, completions, asOfDate);
}

/** completed / scheduled occurrences, as a percentage. */
export function calculateCompletionRate(
  scheduledDates: string[],
  completedDates: string[],
): number {
  if (scheduledDates.length === 0) return 0;
  const completed = new Set(completedDates);
  const count = scheduledDates.filter((date) => completed.has(date)).length;
  return (count / scheduledDates.length) * 100;
}

function completedCountInRange(
  completions: HabitCompletionRecord[],
  start: string,
  end: string,
): number {
  return completions.filter(
    (c) =>
      c.completed &&
      compareDateStrings(c.date, start) >= 0 &&
      compareDateStrings(c.date, end) <= 0,
  ).length;
}

/**
 * Scheduled/completed occurrence counts over [rangeStart, rangeEnd] — the
 * shared basis for every completion-rate figure in the app. For a weekly
 * ("N times per week") habit this counts each overlapping week's target
 * once, not one occurrence per calendar day, so rates stay consistent with
 * how currentWeeklyStreak/longestWeeklyStreak already treat the week (not
 * the day) as the scheduled unit.
 */
export function calculateRangeCompletion(
  habit: ScheduledHabit,
  completions: HabitCompletionRecord[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: 0 | 1 = 1,
): RangeCompletion {
  if (getCurrentVersion(habit)?.frequencyType !== "weekly") {
    const scheduled = getScheduledDates(habit, rangeStart, rangeEnd);
    const completedSet = new Set(
      completions.filter((c) => c.completed).map((c) => c.date),
    );
    const completed = scheduled.filter((d) => completedSet.has(d)).length;
    return {
      scheduled: scheduled.length,
      completed,
      rate: calculateCompletionRate(scheduled, [...completedSet]),
    };
  }

  const start =
    compareDateStrings(rangeStart, habit.startDate) > 0
      ? rangeStart
      : habit.startDate;
  const end =
    habit.endDate && compareDateStrings(habit.endDate, rangeEnd) < 0
      ? habit.endDate
      : rangeEnd;

  if (compareDateStrings(start, end) > 0) {
    return { scheduled: 0, completed: 0, rate: 0 };
  }

  let scheduled = 0;
  let completed = 0;
  const startWeek = getWeekStart(start, weekStartsOn);
  const endWeek = getWeekStart(end, weekStartsOn);
  for (
    let weekStart = startWeek;
    compareDateStrings(weekStart, endWeek) <= 0;
    weekStart = addDays(weekStart, 7)
  ) {
    const weekEnd = addDays(weekStart, 6);
    const overlapStart =
      compareDateStrings(weekStart, start) > 0 ? weekStart : start;
    const overlapEnd = compareDateStrings(weekEnd, end) < 0 ? weekEnd : end;
    if (compareDateStrings(overlapStart, overlapEnd) > 0) continue;

    const target = weeklyTargetFor(habit, weekStart);
    const countInWeek = completedCountInRange(
      completions,
      overlapStart,
      overlapEnd,
    );
    scheduled += target;
    completed += Math.min(countInWeek, target);
  }

  return {
    scheduled,
    completed,
    rate: scheduled > 0 ? (completed / scheduled) * 100 : 0,
  };
}
