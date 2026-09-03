import { describe, expect, it } from "vitest";

import { enumerateDates } from "@/lib/dates/date-string";
import { calculateHabitStats } from "@/lib/habits/stats";
import type {
  FrequencyType,
  HabitCompletionRecord,
  HabitScheduleInfo,
  ScheduledHabit,
} from "@/lib/habits/types";

function habit(
  overrides: {
    frequencyType?: FrequencyType;
    startDate?: string;
    endDate?: string | null;
    schedule?: HabitScheduleInfo | null;
  } = {},
): ScheduledHabit {
  const startDate = overrides.startDate ?? "2026-08-01";
  return {
    startDate,
    endDate: overrides.endDate ?? null,
    versions: [
      {
        frequencyType: overrides.frequencyType ?? "daily",
        schedule: overrides.schedule ?? null,
        effectiveFrom: startDate,
        effectiveUntil: null,
      },
    ],
  };
}

const dailyHabit = habit();

function completionsFor(dates: string[]): HabitCompletionRecord[] {
  return dates.map((date) => ({ date, completed: true, value: 1 }));
}

describe("calculateHabitStats", () => {
  it("computes overall rate, monthly progress, trend, and total completions", () => {
    // August: completed the first 20 days, missed the rest of the month.
    // September (as of the 15th): completed the first 10 days, missed 11-15.
    const completedAugust = enumerateDates("2026-08-01", "2026-08-20");
    const completedSeptember = enumerateDates("2026-09-01", "2026-09-10");
    const completions = completionsFor([
      ...completedAugust,
      ...completedSeptember,
    ]);

    const stats = calculateHabitStats(dailyHabit, completions, "2026-09-15", 1);

    expect(stats.totalCompletions).toBe(30);
    expect(stats.thisMonth).toEqual({
      completed: 10,
      scheduled: 15,
      rate: expect.closeTo(66.67, 1),
    });
    expect(stats.trend.lastMonthRate).toBeCloseTo(64.52, 1); // 20/31
    expect(stats.trend.thisMonthRate).toBeCloseTo(66.67, 1); // 10/15
    expect(stats.trend.delta).toBeCloseTo(2.15, 1);
    expect(stats.completionRate).toBeCloseTo((30 / 46) * 100, 1); // Aug 1 - Sep 15 = 46 days
    expect(stats.longestStreak).toBe(20); // the unbroken Aug 1-20 run
    expect(stats.currentStreak).toBe(0); // Sep 11-15 all missed, including today
  });

  it("returns zeros for a habit with no completion history", () => {
    const stats = calculateHabitStats(dailyHabit, [], "2026-09-15", 1);
    expect(stats.totalCompletions).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.thisMonth.completed).toBe(0);
  });

  it("does not let an in-progress current month exceed today", () => {
    // Only 5 days into September — "scheduled" for this month must not
    // count days 6-30 that haven't happened yet.
    const stats = calculateHabitStats(dailyHabit, [], "2026-09-05", 1);
    expect(stats.thisMonth.scheduled).toBe(5);
  });

  it("gives a habit that started this month a full previous month at 0%, not a crash", () => {
    const freshHabit = habit({ startDate: "2026-09-01" });
    const stats = calculateHabitStats(freshHabit, [], "2026-09-10", 1);
    expect(stats.trend.lastMonthRate).toBe(0);
  });

  it("rates a weekly (N times per week) habit against its weekly target, not every calendar day", () => {
    // Regression: a 3x/week habit hit exactly on target every week used to
    // be measured against every day since startDate (~35 "scheduled" days)
    // instead of the 15 actually-scheduled occurrences (5 weeks x 3).
    const weeklyHabit = habit({
      frequencyType: "weekly",
      startDate: "2026-08-03", // Monday
      schedule: { daysOfWeek: null, timesPerPeriod: 3 },
    });
    // Every week from 08-03 through 09-06 (Sun), hit exactly 3 times.
    const completions = completionsFor([
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
      "2026-08-10",
      "2026-08-12",
      "2026-08-14",
      "2026-08-17",
      "2026-08-19",
      "2026-08-21",
      "2026-08-24",
      "2026-08-26",
      "2026-08-28",
      "2026-08-31",
      "2026-09-02",
      "2026-09-04",
    ]);

    const stats = calculateHabitStats(
      weeklyHabit,
      completions,
      "2026-09-06",
      1,
    );

    expect(stats.completionRate).toBe(100);
  });
});
