import { createClient } from "@/lib/supabase/server";

import { getCalendarDays, type CalendarDay } from "./calendar";
import { groupScheduleVersionsByHabit } from "./schedule";
import { calculateHabitStats, monthRange, type HabitStats } from "./stats";
import type {
  FrequencyType,
  HabitCompletionRecord,
  HabitType,
  ScheduledHabit,
} from "./types";

export interface RecentCompletion {
  date: string;
  value: number | null;
  note: string | null;
}

export interface HabitDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  type: HabitType;
  target: number | null;
  unit: string | null;
  frequencyType: FrequencyType;
  daysOfWeek: number[] | null;
  timesPerPeriod: number | null;
  startDate: string;
  endDate: string | null;
  isArchived: boolean;
  categoryName: string | null;
  stats: HabitStats;
  calendarDays: CalendarDay[];
  recentCompletions: RecentCompletion[];
}

/**
 * Loads everything the habit detail page needs in two queries. Fetches the
 * habit's full completion history (not paginated) to keep streak/rate math
 * correct — the same tradeoff already accepted in getTodayHabits.
 */
export async function getHabitDetail(
  habitId: string,
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<HabitDetail | null> {
  const supabase = await createClient();

  const [
    { data: habit, error: habitError },
    { data: completions, error: completionsError },
    { data: scheduleVersions, error: versionsError },
  ] = await Promise.all([
    supabase
      .from("habits")
      .select(
        "*, habit_schedules(days_of_week, times_per_period), categories(name)",
      )
      .eq("id", habitId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("habit_completions")
      .select("date, completed, value, note")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase
      .from("habit_schedule_versions")
      .select(
        "habit_id, frequency_type, days_of_week, times_per_period, effective_from, effective_until",
      )
      .eq("habit_id", habitId),
  ]);

  if (habitError || completionsError || versionsError) {
    throw new Error("Couldn't load this habit");
  }
  if (!habit) return null;

  const currentSchedule = Array.isArray(habit.habit_schedules)
    ? habit.habit_schedules[0]
    : habit.habit_schedules;
  const category = Array.isArray(habit.categories)
    ? habit.categories[0]
    : habit.categories;

  const scheduledHabit: ScheduledHabit = {
    startDate: habit.start_date,
    endDate: habit.end_date,
    versions:
      groupScheduleVersionsByHabit(scheduleVersions ?? []).get(habitId) ?? [],
  };

  const completionRecords: HabitCompletionRecord[] = (completions ?? []).map(
    (c) => ({
      date: c.date,
      completed: c.completed,
      value: c.value,
    }),
  );

  const stats = calculateHabitStats(
    scheduledHabit,
    completionRecords,
    today,
    weekStartsOn,
  );

  const { start: monthStart, end: monthEnd } = monthRange(today);
  const calendarDays = getCalendarDays(
    scheduledHabit,
    completionRecords,
    monthStart,
    monthEnd,
    today,
  );

  const recentCompletions: RecentCompletion[] = (completions ?? [])
    .filter((c) => c.completed)
    .slice(0, 10)
    .map((c) => ({ date: c.date, value: c.value, note: c.note }));

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    type: habit.type as HabitType,
    target: habit.target,
    unit: habit.unit,
    frequencyType: habit.frequency_type as FrequencyType,
    daysOfWeek: currentSchedule?.days_of_week ?? null,
    timesPerPeriod: currentSchedule?.times_per_period ?? null,
    startDate: habit.start_date,
    endDate: habit.end_date,
    isArchived: habit.is_archived,
    categoryName: category?.name ?? null,
    stats,
    calendarDays,
    recentCompletions,
  };
}
