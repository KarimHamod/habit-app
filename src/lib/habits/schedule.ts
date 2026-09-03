import {
  compareDateStrings,
  enumerateDates,
  getDayOfWeek,
} from "@/lib/dates/date-string";

import type { FrequencyType, ScheduledHabit, ScheduleVersion } from "./types";

/** Shape of a `habit_schedule_versions` row, as selected from Supabase. */
export interface HabitScheduleVersionRow {
  habit_id: string;
  frequency_type: string;
  days_of_week: number[] | null;
  times_per_period: number | null;
  effective_from: string;
  effective_until: string | null;
}

/** Groups raw schedule-version rows by habit_id and maps them into the domain shape. */
export function groupScheduleVersionsByHabit(
  rows: HabitScheduleVersionRow[],
): Map<string, ScheduleVersion[]> {
  const map = new Map<string, ScheduleVersion[]>();
  for (const row of rows) {
    const list = map.get(row.habit_id) ?? [];
    list.push({
      frequencyType: row.frequency_type as FrequencyType,
      schedule: {
        daysOfWeek: row.days_of_week,
        timesPerPeriod: row.times_per_period,
      },
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until,
    });
    map.set(row.habit_id, list);
  }
  return map;
}

/** The schedule version that actually governed `date`, or null if none covers it. */
export function resolveVersionAt(
  habit: ScheduledHabit,
  date: string,
): ScheduleVersion | null {
  return (
    habit.versions.find(
      (v) =>
        compareDateStrings(date, v.effectiveFrom) >= 0 &&
        (v.effectiveUntil === null ||
          compareDateStrings(date, v.effectiveUntil) <= 0),
    ) ?? null
  );
}

/** The still-open version (effectiveUntil: null) — the habit's schedule as of right now. */
export function getCurrentVersion(
  habit: ScheduledHabit,
): ScheduleVersion | null {
  return habit.versions.find((v) => v.effectiveUntil === null) ?? null;
}

function isScheduledUnderVersion(
  version: ScheduleVersion,
  date: string,
): boolean {
  switch (version.frequencyType) {
    case "daily":
      return true;
    case "weekly":
      // Flexible frequency: any day in range is eligible. The weekly target
      // (timesPerPeriod) is enforced per-week by the streak engine, not here.
      return true;
    case "specific_days":
    case "custom": {
      const days = version.schedule?.daysOfWeek;
      return days != null && days.includes(getDayOfWeek(date));
    }
    default:
      return false;
  }
}

export function isHabitScheduledOnDate(
  habit: ScheduledHabit,
  date: string,
): boolean {
  if (compareDateStrings(date, habit.startDate) < 0) return false;
  if (habit.endDate && compareDateStrings(date, habit.endDate) > 0)
    return false;

  const version = resolveVersionAt(habit, date);
  if (!version) return false;

  return isScheduledUnderVersion(version, date);
}

/** All scheduled occurrences between rangeStart and rangeEnd, clamped to the habit's own active window. */
export function getScheduledDates(
  habit: ScheduledHabit,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const start =
    compareDateStrings(rangeStart, habit.startDate) > 0
      ? rangeStart
      : habit.startDate;
  const end =
    habit.endDate && compareDateStrings(habit.endDate, rangeEnd) < 0
      ? habit.endDate
      : rangeEnd;

  if (compareDateStrings(start, end) > 0) return [];

  return enumerateDates(start, end).filter((date) =>
    isHabitScheduledOnDate(habit, date),
  );
}
