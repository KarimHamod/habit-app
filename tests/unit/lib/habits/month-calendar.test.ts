import { describe, expect, it } from "vitest";

import {
  buildMonthCalendar,
  type HabitForCalendar,
} from "@/lib/habits/month-calendar";
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

function dailySchedule(startDate = "2026-08-01"): ScheduledHabit {
  return buildSchedule({ startDate });
}

describe("buildMonthCalendar", () => {
  it("marks a day complete only when every scheduled habit was completed", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Meditate",
        color: null,
        schedule: dailySchedule(),
        completions: [{ date: "2026-08-01", completed: true, value: 1 }],
      },
      {
        id: "b",
        name: "Run",
        color: null,
        schedule: dailySchedule(),
        completions: [{ date: "2026-08-01", completed: true, value: 1 }],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("complete");
    expect(days[0].habits).toHaveLength(2);
  });

  it("marks a day partial when only some scheduled habits were completed", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Meditate",
        color: null,
        schedule: dailySchedule(),
        completions: [{ date: "2026-08-01", completed: true, value: 1 }],
      },
      {
        id: "b",
        name: "Run",
        color: null,
        schedule: dailySchedule(),
        completions: [],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("partial");
  });

  it("marks a day missed when scheduled habits exist but none were completed", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Meditate",
        color: null,
        schedule: dailySchedule(),
        completions: [],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("missed");
  });

  it("marks a day none-scheduled when no habits are due", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Meditate",
        color: null,
        schedule: dailySchedule("2026-08-05"),
        completions: [],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-05",
    );
    expect(days[0].status).toBe("none-scheduled");
    expect(days[0].habits).toHaveLength(0);
  });

  it("marks days after today as future regardless of schedule", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Meditate",
        color: null,
        schedule: dailySchedule(),
        completions: [],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-02",
      "2026-08-01",
    );
    expect(days[1].status).toBe("future");
  });

  it("excludes unscheduled habits from a day's habit list", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Weekday-only",
        color: null,
        schedule: buildSchedule({
          frequencyType: "specific_days",
          schedule: { daysOfWeek: [1, 2, 3, 4, 5], timesPerPeriod: null },
        }),
        completions: [],
      },
    ];
    // 2026-08-01 is a Saturday — not scheduled.
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("none-scheduled");
  });

  it("excludes an undone weekly (N times per week) habit from a day's list instead of marking it missed", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Run",
        color: null,
        schedule: buildSchedule({
          frequencyType: "weekly",
          schedule: { daysOfWeek: null, timesPerPeriod: 3 },
        }),
        completions: [],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("none-scheduled");
    expect(days[0].habits).toHaveLength(0);
  });

  it("still shows a completed weekly habit on the day it was done", () => {
    const habits: HabitForCalendar[] = [
      {
        id: "a",
        name: "Run",
        color: null,
        schedule: buildSchedule({
          frequencyType: "weekly",
          schedule: { daysOfWeek: null, timesPerPeriod: 3 },
        }),
        completions: [{ date: "2026-08-01", completed: true, value: 1 }],
      },
    ];
    const days = buildMonthCalendar(
      habits,
      "2026-08-01",
      "2026-08-01",
      "2026-08-01",
    );
    expect(days[0].status).toBe("complete");
    expect(days[0].habits).toEqual([
      { habitId: "a", name: "Run", color: null, completed: true },
    ]);
  });
});
