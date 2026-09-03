import { createClient } from "@/lib/supabase/server";

import {
  buildMonthCalendar,
  type HabitForCalendar,
  type MonthCalendarDay,
} from "./month-calendar";
import { groupScheduleVersionsByHabit } from "./schedule";
import type { HabitCompletionRecord } from "./types";

/**
 * Loads every active habit and its completions within one month, then
 * aggregates them into per-day status. Archived habits are excluded, same
 * scope as the Today page, so the calendar reflects what's currently being
 * tracked rather than a full historical record.
 */
export async function getMonthCalendarData(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  today: string,
): Promise<MonthCalendarDay[]> {
  const supabase = await createClient();

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, color, start_date, end_date")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!habits || habits.length === 0)
    return buildMonthCalendar([], rangeStart, rangeEnd, today);

  const habitIds = habits.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .gte("date", rangeStart)
        .lte("date", rangeEnd),
      supabase
        .from("habit_schedule_versions")
        .select(
          "habit_id, frequency_type, days_of_week, times_per_period, effective_from, effective_until",
        )
        .in("habit_id", habitIds),
    ]);

  const completionsByHabit = new Map<string, HabitCompletionRecord[]>();
  for (const completion of completions ?? []) {
    const list = completionsByHabit.get(completion.habit_id) ?? [];
    list.push({
      date: completion.date,
      completed: completion.completed,
      value: completion.value,
    });
    completionsByHabit.set(completion.habit_id, list);
  }

  const versionsByHabit = groupScheduleVersionsByHabit(
    scheduleVersionRows ?? [],
  );

  const habitsForCalendar: HabitForCalendar[] = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    color: habit.color,
    schedule: {
      startDate: habit.start_date,
      endDate: habit.end_date,
      versions: versionsByHabit.get(habit.id) ?? [],
    },
    completions: completionsByHabit.get(habit.id) ?? [],
  }));

  return buildMonthCalendar(habitsForCalendar, rangeStart, rangeEnd, today);
}
