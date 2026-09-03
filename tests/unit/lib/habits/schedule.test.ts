import { describe, expect, it } from "vitest";

import {
  getScheduledDates,
  isHabitScheduledOnDate,
} from "@/lib/habits/schedule";
import type {
  FrequencyType,
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

describe("isHabitScheduledOnDate", () => {
  it("schedules a daily habit every day", () => {
    const h = habit({ frequencyType: "daily" });
    expect(isHabitScheduledOnDate(h, "2026-08-01")).toBe(true);
    expect(isHabitScheduledOnDate(h, "2026-08-15")).toBe(true);
  });

  it("schedules weekdays (specific_days) only on Mon-Fri", () => {
    const h = habit({
      frequencyType: "specific_days",
      schedule: { daysOfWeek: [1, 2, 3, 4, 5], timesPerPeriod: null },
    });
    expect(isHabitScheduledOnDate(h, "2026-08-31")).toBe(true); // Monday
    expect(isHabitScheduledOnDate(h, "2026-08-30")).toBe(false); // Sunday
    expect(isHabitScheduledOnDate(h, "2026-09-05")).toBe(false); // Saturday
  });

  it("schedules specific days like Mon/Wed/Fri", () => {
    const h = habit({
      frequencyType: "specific_days",
      schedule: { daysOfWeek: [1, 3, 5], timesPerPeriod: null },
    });
    expect(isHabitScheduledOnDate(h, "2026-08-31")).toBe(true); // Monday
    expect(isHabitScheduledOnDate(h, "2026-09-01")).toBe(false); // Tuesday
    expect(isHabitScheduledOnDate(h, "2026-09-02")).toBe(true); // Wednesday
  });

  it("treats a specific_days habit with no configured days as never scheduled", () => {
    const h = habit({ frequencyType: "specific_days", schedule: null });
    expect(isHabitScheduledOnDate(h, "2026-08-31")).toBe(false);
  });

  it("is not scheduled before its start date", () => {
    const h = habit({ frequencyType: "daily", startDate: "2026-08-10" });
    expect(isHabitScheduledOnDate(h, "2026-08-09")).toBe(false);
    expect(isHabitScheduledOnDate(h, "2026-08-10")).toBe(true);
  });

  it("is not scheduled after its end date", () => {
    const h = habit({
      frequencyType: "daily",
      startDate: "2026-08-01",
      endDate: "2026-08-10",
    });
    expect(isHabitScheduledOnDate(h, "2026-08-10")).toBe(true);
    expect(isHabitScheduledOnDate(h, "2026-08-11")).toBe(false);
  });

  it("treats a weekly habit as eligible every day within range", () => {
    const h = habit({
      frequencyType: "weekly",
      schedule: { daysOfWeek: null, timesPerPeriod: 3 },
    });
    expect(isHabitScheduledOnDate(h, "2026-08-04")).toBe(true);
    expect(isHabitScheduledOnDate(h, "2026-08-05")).toBe(true);
  });
});

describe("getScheduledDates", () => {
  it("lists Mon/Wed/Fri occurrences within a week", () => {
    const h = habit({
      frequencyType: "specific_days",
      startDate: "2026-08-01",
      schedule: { daysOfWeek: [1, 3, 5], timesPerPeriod: null },
    });
    // 2026-08-03 is a Monday.
    expect(getScheduledDates(h, "2026-08-03", "2026-08-09")).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
    ]);
  });

  it("clamps to the habit's own start/end date, not just the requested range", () => {
    const h = habit({
      frequencyType: "daily",
      startDate: "2026-08-05",
      endDate: "2026-08-07",
    });
    expect(getScheduledDates(h, "2026-08-01", "2026-08-31")).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("returns an empty list when the range is entirely outside the habit's window", () => {
    const h = habit({
      frequencyType: "daily",
      startDate: "2026-08-05",
      endDate: "2026-08-07",
    });
    expect(getScheduledDates(h, "2026-01-01", "2026-01-31")).toEqual([]);
  });
});
