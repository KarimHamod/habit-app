import { describe, expect, it } from "vitest";

import { getCalendarDays } from "@/lib/habits/calendar";
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

describe("getCalendarDays", () => {
  it("marks completed and missed days for a daily habit", () => {
    const completions: HabitCompletionRecord[] = [
      { date: "2026-08-01", completed: true, value: 1 },
    ];
    const days = getCalendarDays(
      habit(),
      completions,
      "2026-08-01",
      "2026-08-03",
      "2026-08-03",
    );
    expect(days).toEqual([
      { date: "2026-08-01", status: "completed" },
      { date: "2026-08-02", status: "missed" },
      { date: "2026-08-03", status: "missed" },
    ]);
  });

  it("marks unscheduled days distinctly from missed days", () => {
    const monWedFri = habit({
      frequencyType: "specific_days",
      schedule: { daysOfWeek: [1, 3, 5], timesPerPeriod: null },
    });
    // 2026-08-03 Mon, 08-04 Tue (unscheduled), 08-05 Wed
    const days = getCalendarDays(
      monWedFri,
      [],
      "2026-08-03",
      "2026-08-05",
      "2026-08-05",
    );
    expect(days).toEqual([
      { date: "2026-08-03", status: "missed" },
      { date: "2026-08-04", status: "unscheduled" },
      { date: "2026-08-05", status: "missed" },
    ]);
  });

  it("marks dates after today as future, even if scheduled", () => {
    const days = getCalendarDays(
      habit(),
      [],
      "2026-08-01",
      "2026-08-03",
      "2026-08-01",
    );
    expect(days).toEqual([
      { date: "2026-08-01", status: "missed" },
      { date: "2026-08-02", status: "future" },
      { date: "2026-08-03", status: "future" },
    ]);
  });

  it("does not mark a day before the habit's start date as missed", () => {
    const h = habit({ startDate: "2026-08-02" });
    const days = getCalendarDays(
      h,
      [],
      "2026-08-01",
      "2026-08-02",
      "2026-08-02",
    );
    expect(days).toEqual([
      { date: "2026-08-01", status: "unscheduled" },
      { date: "2026-08-02", status: "missed" },
    ]);
  });

  it("never marks an untouched day 'missed' for a weekly (N times per week) habit", () => {
    // Regression: a weekly habit has no fixed per-day expectation, so an
    // undone day used to paint red every day it wasn't touched even when
    // the week's target was otherwise on track.
    const weekly = habit({
      frequencyType: "weekly",
      schedule: { daysOfWeek: null, timesPerPeriod: 3 },
    });
    const completions: HabitCompletionRecord[] = [
      { date: "2026-08-01", completed: true, value: 1 },
    ];
    const days = getCalendarDays(
      weekly,
      completions,
      "2026-08-01",
      "2026-08-03",
      "2026-08-03",
    );
    expect(days).toEqual([
      { date: "2026-08-01", status: "completed" },
      { date: "2026-08-02", status: "unscheduled" },
      { date: "2026-08-03", status: "unscheduled" },
    ]);
  });
});
