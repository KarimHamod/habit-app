import { createClient } from "@/lib/supabase/server";

import { calculateHabitProgress } from "./completion";
import { groupScheduleVersionsByHabit, isHabitScheduledOnDate } from "./schedule";
import { calculateCurrentStreak } from "./streak";
import type {
  HabitCompletionRecord,
  ScheduledHabit,
  TodayHabit,
} from "./types";

/**
 * Loads this user's habits scheduled for `date`, with today's completion
 * state and current streak. RLS still scopes every query to the session's
 * own user — `userId` here is never client-supplied, only ever the id the
 * caller already read from the authenticated session.
 */
export async function getTodayHabits(
  userId: string,
  date: string,
): Promise<TodayHabit[]> {
  const supabase = await createClient();

  const [{ data: profile }, { data: habits }] = await Promise.all([
    supabase
      .from("profiles")
      .select("week_starts_on")
      .eq("id", userId)
      .single(),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .lte("start_date", date)
      .or(`end_date.is.null,end_date.gte.${date}`),
  ]);

  if (!habits || habits.length === 0) return [];

  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const habitIds = habits.map((habit) => habit.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .lte("date", date),
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

  const result: TodayHabit[] = [];

  for (const habit of habits) {
    const scheduledHabit: ScheduledHabit = {
      startDate: habit.start_date,
      endDate: habit.end_date,
      versions: versionsByHabit.get(habit.id) ?? [],
    };

    if (!isHabitScheduledOnDate(scheduledHabit, date)) continue;

    const habitCompletions = completionsByHabit.get(habit.id) ?? [];
    const todayCompletion = habitCompletions.find((c) => c.date === date);
    const currentStreak = calculateCurrentStreak(
      scheduledHabit,
      habitCompletions,
      date,
      weekStartsOn,
    );

    const progress =
      habit.type === "boolean"
        ? todayCompletion?.completed
          ? 100
          : 0
        : calculateHabitProgress(
            todayCompletion?.value ?? 0,
            habit.target ?? 0,
          );

    result.push({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      type: habit.type as TodayHabit["type"],
      target: habit.target,
      unit: habit.unit,
      completed: todayCompletion?.completed ?? false,
      value: todayCompletion?.value ?? null,
      progress,
      currentStreak,
    });
  }

  return result;
}
