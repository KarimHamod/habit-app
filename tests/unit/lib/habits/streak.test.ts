import { describe, expect, it } from "vitest";

import {
  calculateCompletionRate,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateRangeCompletion,
} from "@/lib/habits/streak";
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

function completion(
  date: string,
  completed = true,
  value: number | null = 1,
): HabitCompletionRecord {
  return { date, completed, value };
}

describe("calculateCurrentStreak — daily habit", () => {
  it("counts consecutive completed days", () => {
    const h = habit({ frequencyType: "daily" });
    const completions = [
      completion("2026-08-01"),
      completion("2026-08-02"),
      completion("2026-08-03"),
    ];
    expect(calculateCurrentStreak(h, completions, "2026-08-03")).toBe(3);
  });

  it("does not break the streak because today hasn't been completed yet", () => {
    const h = habit({ frequencyType: "daily" });
    const completions = [completion("2026-08-01"), completion("2026-08-02")];
    // asOfDate (08-03) is scheduled but has no completion yet — streak should
    // still reflect the two prior completed days, not reset to 0.
    expect(calculateCurrentStreak(h, completions, "2026-08-03")).toBe(2);
  });

  it("returns 0 for an empty completion history", () => {
    const h = habit({ frequencyType: "daily" });
    expect(calculateCurrentStreak(h, [], "2026-08-03")).toBe(0);
  });

  it("ignores completions dated after asOfDate", () => {
    const h = habit({ frequencyType: "daily" });
    const completions = [
      completion("2026-08-01"),
      completion("2026-08-02"),
      completion("2026-08-03"),
      completion("2026-08-10"), // future relative to asOfDate
    ];
    expect(calculateCurrentStreak(h, completions, "2026-08-03")).toBe(3);
  });
});

describe("calculateCurrentStreak — specific days", () => {
  const monWedFri = habit({
    frequencyType: "specific_days",
    schedule: { daysOfWeek: [1, 3, 5], timesPerPeriod: null },
  });

  it("is not broken by unscheduled days between occurrences", () => {
    // Mon 08-03, Wed 08-05, Fri 08-07 — all completed. Tue/Thu/weekend never
    // appear as scheduled occurrences, so they can't break the streak.
    const completions = [
      completion("2026-08-03"),
      completion("2026-08-05"),
      completion("2026-08-07"),
    ];
    expect(calculateCurrentStreak(monWedFri, completions, "2026-08-07")).toBe(
      3,
    );
  });

  it("breaks at a missed scheduled occurrence", () => {
    // Mon completed, Wed missed, Fri completed — streak resets after the miss.
    const completions = [completion("2026-08-03"), completion("2026-08-07")];
    expect(calculateCurrentStreak(monWedFri, completions, "2026-08-07")).toBe(
      1,
    );
  });
});

describe("calculateLongestStreak", () => {
  it("finds the longest run even if the current streak is shorter", () => {
    const h = habit({ frequencyType: "daily" });
    const completions = [
      completion("2026-08-01"),
      completion("2026-08-02"),
      completion("2026-08-03"),
      // 08-04 missed
      completion("2026-08-05"),
      completion("2026-08-06"),
    ];
    expect(calculateLongestStreak(h, completions, "2026-08-06")).toBe(3);
    expect(calculateCurrentStreak(h, completions, "2026-08-06")).toBe(2);
  });

  it("returns 0 for an empty completion history", () => {
    const h = habit({ frequencyType: "daily" });
    expect(calculateLongestStreak(h, [], "2026-08-06")).toBe(0);
  });
});

describe("calculateCurrentStreak — weekly (N times per week)", () => {
  const weekly = habit({
    frequencyType: "weekly",
    startDate: "2026-08-24",
    schedule: { daysOfWeek: null, timesPerPeriod: 3 },
  });

  it("counts a fully-met previous week without requiring the current week to be finished yet", () => {
    const completions = [
      // Week of 08-24 (Mon-Sun): 3 completions, meets target.
      completion("2026-08-24"),
      completion("2026-08-26"),
      completion("2026-08-28"),
      // Current week (08-31 onward): only 2 so far, as of 09-03.
      completion("2026-09-01"),
      completion("2026-09-02"),
    ];
    expect(calculateCurrentStreak(weekly, completions, "2026-09-03", 1)).toBe(
      1,
    );
  });

  it("breaks when a week falls short of the target", () => {
    const completions = [
      // Week of 08-24: only 1 completion, misses target of 3.
      completion("2026-08-24"),
    ];
    expect(calculateCurrentStreak(weekly, completions, "2026-09-03", 1)).toBe(
      0,
    );
  });
});

describe("calculateCompletionRate", () => {
  it("computes the percentage of scheduled dates that were completed", () => {
    const scheduled = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"];
    const completed = ["2026-08-01", "2026-08-03", "2026-08-04"];
    expect(calculateCompletionRate(scheduled, completed)).toBeCloseTo(75, 5);
  });

  it("returns 0 when nothing was scheduled", () => {
    expect(calculateCompletionRate([], [])).toBe(0);
  });

  it("matches the spec example (22/28 ≈ 78.6%)", () => {
    const scheduled = Array.from({ length: 28 }, (_, i) => `day-${i}`);
    const completed = scheduled.slice(0, 22);
    expect(calculateCompletionRate(scheduled, completed)).toBeCloseTo(78.57, 1);
  });
});

describe("calculateRangeCompletion — daily habit", () => {
  it("matches calculateCompletionRate's day-by-day counting", () => {
    const h = habit({ frequencyType: "daily" });
    const completions = [
      completion("2026-08-01"),
      completion("2026-08-03"),
      completion("2026-08-04"),
    ];
    const result = calculateRangeCompletion(
      h,
      completions,
      "2026-08-01",
      "2026-08-04",
    );
    expect(result).toEqual({ scheduled: 4, completed: 3, rate: 75 });
  });
});

describe("calculateRangeCompletion — weekly (N times per week)", () => {
  const weekly = habit({
    frequencyType: "weekly",
    startDate: "2026-08-24",
    schedule: { daysOfWeek: null, timesPerPeriod: 3 },
  });

  it("counts each overlapping week's target once, not one occurrence per day", () => {
    // Regression: a 3x/week habit hit exactly on target across two full
    // weeks used to be measured against every calendar day (14 days), not
    // the 6 actually-scheduled occurrences — reporting ~43% instead of 100%.
    const completions = [
      completion("2026-08-24"),
      completion("2026-08-26"),
      completion("2026-08-28"),
      completion("2026-08-31"),
      completion("2026-09-02"),
      completion("2026-09-04"),
    ];
    const result = calculateRangeCompletion(
      weekly,
      completions,
      "2026-08-24",
      "2026-09-06",
      1,
    );
    expect(result).toEqual({ scheduled: 6, completed: 6, rate: 100 });
  });

  it("caps a week's contribution at the target even if it was exceeded", () => {
    const completions = [
      completion("2026-08-24"),
      completion("2026-08-25"),
      completion("2026-08-26"),
      completion("2026-08-27"),
      completion("2026-08-28"),
    ];
    const result = calculateRangeCompletion(
      weekly,
      completions,
      "2026-08-24",
      "2026-08-30",
      1,
    );
    expect(result).toEqual({ scheduled: 3, completed: 3, rate: 100 });
  });

  it("returns 0 scheduled for a range with no overlapping weeks in the habit's window", () => {
    const result = calculateRangeCompletion(
      weekly,
      [],
      "2026-01-01",
      "2026-01-31",
      1,
    );
    expect(result).toEqual({ scheduled: 0, completed: 0, rate: 0 });
  });
});
