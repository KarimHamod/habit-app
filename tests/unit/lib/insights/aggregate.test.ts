import { describe, expect, it } from "vitest";

import {
  aggregateCompletionRate,
  buildWeeklyConsistency,
  rankHabitPerformance,
  rankWeeklyChange,
} from "@/lib/insights/aggregate";
import type { HabitWithHistory } from "@/lib/insights/aggregate";
import type {
  FrequencyType,
  HabitScheduleInfo,
  ScheduledHabit,
} from "@/lib/habits/types";

function buildSchedule(
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

function habit(overrides: Partial<HabitWithHistory> = {}): HabitWithHistory {
  return {
    id: "a",
    name: "Meditate",
    color: null,
    schedule: buildSchedule(),
    completions: [],
    ...overrides,
  };
}

describe("aggregateCompletionRate", () => {
  it("sums scheduled and completed occurrences across multiple habits", () => {
    const habits: HabitWithHistory[] = [
      habit({
        id: "a",
        completions: [{ date: "2026-08-01", completed: true, value: 1 }],
      }),
      habit({ id: "b", completions: [] }),
    ];
    // Both daily habits scheduled on 08-01: 2 scheduled, 1 completed -> 50%.
    expect(aggregateCompletionRate(habits, "2026-08-01", "2026-08-01")).toBe(
      50,
    );
  });

  it("returns 0 when nothing is scheduled in range", () => {
    expect(aggregateCompletionRate([], "2026-08-01", "2026-08-01")).toBe(0);
  });

  it("returns 0 for an inverted range instead of throwing", () => {
    const habits: HabitWithHistory[] = [habit()];
    expect(aggregateCompletionRate(habits, "2026-08-05", "2026-08-01")).toBe(0);
  });
});

describe("buildWeeklyConsistency", () => {
  it("returns one point per week, ending with the current week", () => {
    const habits: HabitWithHistory[] = [habit()];
    const points = buildWeeklyConsistency(habits, "2026-09-01", 1, 4);
    expect(points).toHaveLength(4);
    // 2026-09-01 is a Tuesday; its week starts Monday 2026-08-31.
    expect(points[points.length - 1].weekStart).toBe("2026-08-31");
  });

  it("does not count days beyond today in the current week", () => {
    const habits: HabitWithHistory[] = [habit({ completions: [] })];
    const points = buildWeeklyConsistency(habits, "2026-08-31", 1, 1);
    // Only 2026-08-31 itself is in range for the current week — 0/1 completed.
    expect(points[0].rate).toBe(0);
  });
});

describe("rankHabitPerformance", () => {
  it("sorts habits by trailing 30-day completion rate, best first", () => {
    const habits: HabitWithHistory[] = [
      habit({ id: "low", name: "Low", completions: [] }),
      habit({
        id: "high",
        name: "High",
        completions: [{ date: "2026-09-01", completed: true, value: 1 }],
      }),
    ];
    const ranked = rankHabitPerformance(habits, "2026-09-01", 1);
    expect(ranked[0].habitId).toBe("high");
    expect(ranked[0].rate).toBeGreaterThan(ranked[1].rate);
  });

  it("reflects a habit's real recent history on day 1 of a new month, not a single day", () => {
    // Regression: ranking used to be based on "this calendar month", which
    // on the 1st of a month is only ever 0% or 100% off one data point.
    const strongInAugust: HabitWithHistory = habit({
      id: "strong",
      name: "Strong",
      completions: Array.from({ length: 25 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        completed: true,
        value: 1,
      })),
    });
    const weakInAugust: HabitWithHistory = habit({
      id: "weak",
      name: "Weak",
      completions: [{ date: "2026-09-01", completed: true, value: 1 }], // only today, nothing in August
    });

    const ranked = rankHabitPerformance(
      [strongInAugust, weakInAugust],
      "2026-09-01",
      1,
    );
    expect(ranked[0].habitId).toBe("strong");
    expect(ranked[0].rate).toBeGreaterThan(50);
  });

  it("includes current streak per habit", () => {
    const habits: HabitWithHistory[] = [
      habit({
        completions: [
          { date: "2026-08-31", completed: true, value: 1 },
          { date: "2026-09-01", completed: true, value: 1 },
        ],
      }),
    ];
    const ranked = rankHabitPerformance(habits, "2026-09-01", 1);
    expect(ranked[0].currentStreak).toBe(2);
  });

  it("rates a weekly (N times per week) habit against its weekly target, not every day in the window", () => {
    // Regression: a 3x/week habit hit exactly on target across the trailing
    // window used to be measured against every calendar day (21 "scheduled"
    // days) instead of the 9 actually-scheduled occurrences (3 weeks x 3).
    const weekly: HabitWithHistory = habit({
      id: "run",
      name: "Run",
      schedule: buildSchedule({
        frequencyType: "weekly",
        startDate: "2026-08-03", // Monday
        schedule: { daysOfWeek: null, timesPerPeriod: 3 },
      }),
      completions: [
        // 3 weeks (08-03..08-23), 3 completions each — target met every week.
        { date: "2026-08-03", completed: true, value: 1 },
        { date: "2026-08-05", completed: true, value: 1 },
        { date: "2026-08-07", completed: true, value: 1 },
        { date: "2026-08-10", completed: true, value: 1 },
        { date: "2026-08-12", completed: true, value: 1 },
        { date: "2026-08-14", completed: true, value: 1 },
        { date: "2026-08-17", completed: true, value: 1 },
        { date: "2026-08-19", completed: true, value: 1 },
        { date: "2026-08-21", completed: true, value: 1 },
      ],
    });

    // windowDays=21 and today=08-23 (a Sunday) puts rangeStart exactly on
    // the habit's Monday start, covering 3 complete weeks with no partial
    // week at either boundary.
    const ranked = rankHabitPerformance([weekly], "2026-08-23", 1, 21);
    expect(ranked[0].scheduledCount).toBe(9);
    expect(ranked[0].rate).toBe(100);
  });

  it("reports zero scheduledCount for a habit with nothing scheduled yet in the window", () => {
    const freshHabit: HabitWithHistory = habit({
      schedule: buildSchedule({ startDate: "2026-09-01" }),
    });
    const ranked = rankHabitPerformance([freshHabit], "2026-09-01", 1, 30);
    expect(ranked[0].scheduledCount).toBe(1);

    const notYetStarted: HabitWithHistory = habit({
      schedule: buildSchedule({ startDate: "2026-09-05" }),
    });
    const rankedFuture = rankHabitPerformance(
      [notYetStarted],
      "2026-09-01",
      1,
      30,
    );
    expect(rankedFuture[0].scheduledCount).toBe(0);
    expect(rankedFuture[0].rate).toBe(0);
  });
});

describe("rankWeeklyChange", () => {
  it("sorts habits by week-over-week delta, biggest improvement first", () => {
    const improved = habit({
      id: "exercise",
      name: "Exercise",
      // Last week (08-17 to 08-23): 2/7. This week (08-24 to 08-30): 6/7.
      completions: [
        { date: "2026-08-17", completed: true, value: 1 },
        { date: "2026-08-18", completed: true, value: 1 },
        { date: "2026-08-24", completed: true, value: 1 },
        { date: "2026-08-25", completed: true, value: 1 },
        { date: "2026-08-26", completed: true, value: 1 },
        { date: "2026-08-27", completed: true, value: 1 },
        { date: "2026-08-28", completed: true, value: 1 },
        { date: "2026-08-29", completed: true, value: 1 },
      ],
    });
    const declined = habit({
      id: "reading",
      name: "Reading",
      // Last week: 6/7. This week: 1/7.
      completions: [
        { date: "2026-08-17", completed: true, value: 1 },
        { date: "2026-08-18", completed: true, value: 1 },
        { date: "2026-08-19", completed: true, value: 1 },
        { date: "2026-08-20", completed: true, value: 1 },
        { date: "2026-08-21", completed: true, value: 1 },
        { date: "2026-08-22", completed: true, value: 1 },
        { date: "2026-08-24", completed: true, value: 1 },
      ],
    });

    const ranked = rankWeeklyChange(
      [declined, improved],
      "2026-08-24",
      "2026-08-30",
      "2026-08-17",
      "2026-08-23",
    );

    expect(ranked[0].habitId).toBe("exercise");
    expect(ranked[0].delta).toBeGreaterThan(0);
    expect(ranked[ranked.length - 1].habitId).toBe("reading");
    expect(ranked[ranked.length - 1].delta).toBeLessThan(0);
  });
});
