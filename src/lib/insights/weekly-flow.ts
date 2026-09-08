import { getWeekStart } from "@/lib/dates/date-string";
import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import { createClient } from "@/lib/supabase/server";

import {
  aggregateCompletionRate,
  buildWeeklyFlow,
  type DailyFlowPoint,
  type HabitWithHistory,
} from "./aggregate";

export interface WeeklyFlow {
  days: DailyFlowPoint[];
  /** Completion rate for the current week so far (weekStart through today), not diluted by days that haven't happened yet. */
  consistency: number;
}

/** Day-by-day completion for the current (in-progress) week, for the Today page's Weekly Flow widget. */
export async function getWeeklyFlow(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<WeeklyFlow> {
  const weekStart = getWeekStart(today, weekStartsOn);

  const supabase = await createClient();

  const { data: habitRows } = await supabase
    .from("habits")
    .select("id, start_date, end_date")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!habitRows || habitRows.length === 0) {
    return { days: buildWeeklyFlow([], today, weekStartsOn), consistency: 0 };
  }

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .gte("date", weekStart)
        .lte("date", today),
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

  const habits: HabitWithHistory[] = habitRows.map((habit) => ({
    id: habit.id,
    name: "",
    color: null,
    schedule: {
      startDate: habit.start_date,
      endDate: habit.end_date,
      versions: versionsByHabit.get(habit.id) ?? [],
    },
    completions: completionsByHabit.get(habit.id) ?? [],
  }));

  return {
    days: buildWeeklyFlow(habits, today, weekStartsOn),
    consistency: aggregateCompletionRate(
      habits,
      weekStart,
      today,
      weekStartsOn,
    ),
  };
}
