import { addDays, getWeekStart } from "@/lib/dates/date-string";
import { calculateGoalProgress } from "@/lib/habits/goal";
import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import { calculateCurrentStreak } from "@/lib/habits/streak";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import { createClient } from "@/lib/supabase/server";

import {
  aggregateCompletionRate,
  rankWeeklyChange,
  type HabitWithHistory,
} from "./aggregate";

export interface WeeklyReviewData {
  hasHabits: boolean;
  weekStart: string;
  weekEnd: string;
  completionRate: number;
  bestStreak: { habitName: string; streak: number } | null;
  biggestImprovement: { habitName: string; delta: number } | null;
  needsAttention: { habitName: string; delta: number } | null;
  goals: { completed: number; total: number };
}

/**
 * Reviews the last *fully completed* week (not the in-progress one) —
 * "your week" reads oddly for a week that hasn't finished yet.
 */
export async function getWeeklyReviewData(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<WeeklyReviewData> {
  const currentWeekStart = getWeekStart(today, weekStartsOn);
  const weekStart = addDays(currentWeekStart, -7);
  const weekEnd = addDays(weekStart, 6);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekStart, -1);

  const supabase = await createClient();

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, start_date, end_date")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (habitsError) {
    throw new Error("Couldn't load your weekly review");
  }

  const empty: WeeklyReviewData = {
    hasHabits: false,
    weekStart,
    weekEnd,
    completionRate: 0,
    bestStreak: null,
    biggestImprovement: null,
    needsAttention: null,
    goals: { completed: 0, total: 0 },
  };

  if (!habitRows || habitRows.length === 0) return empty;

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .lte("date", weekEnd),
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

  const habits: HabitWithHistory[] = habitRows.map((habit) => {
    return {
      id: habit.id,
      name: habit.name,
      color: null,
      schedule: {
        startDate: habit.start_date,
        endDate: habit.end_date,
        versions: versionsByHabit.get(habit.id) ?? [],
      },
      completions: completionsByHabit.get(habit.id) ?? [],
    };
  });

  const completionRate = aggregateCompletionRate(
    habits,
    weekStart,
    weekEnd,
    weekStartsOn,
  );

  const streaks = habits.map((h) => ({
    habitName: h.name,
    streak: calculateCurrentStreak(
      h.schedule,
      h.completions,
      weekEnd,
      weekStartsOn,
    ),
  }));
  const bestStreakEntry = streaks.reduce<{
    habitName: string;
    streak: number;
  } | null>(
    (best, current) => (!best || current.streak > best.streak ? current : best),
    null,
  );
  const bestStreak =
    bestStreakEntry && bestStreakEntry.streak > 0 ? bestStreakEntry : null;

  const changes = rankWeeklyChange(
    habits,
    weekStart,
    weekEnd,
    previousWeekStart,
    previousWeekEnd,
    weekStartsOn,
  );
  const topImprovement = changes[0];
  const topDecline = changes[changes.length - 1];
  const biggestImprovement =
    topImprovement && topImprovement.delta > 0
      ? { habitName: topImprovement.name, delta: topImprovement.delta }
      : null;
  const needsAttention =
    topDecline && topDecline.delta < 0
      ? { habitName: topDecline.name, delta: topDecline.delta }
      : null;

  const { data: goalRows } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .lte("start_date", weekEnd)
    .gte("end_date", weekStart)
    .not("habit_id", "is", null);

  let goals = { completed: 0, total: 0 };
  if (goalRows && goalRows.length > 0) {
    const goalHabitIds = [
      ...new Set(
        goalRows
          .map((g) => g.habit_id)
          .filter((id): id is string => id != null),
      ),
    ];
    const { data: goalCompletions } = await supabase
      .from("habit_completions")
      .select("habit_id, date, completed, value")
      .in("habit_id", goalHabitIds)
      .lte("date", weekEnd);

    const completedCount = goalRows.filter((goal) => {
      const relevant: HabitCompletionRecord[] = (goalCompletions ?? [])
        .filter((c) => c.habit_id === goal.habit_id)
        .map((c) => ({ date: c.date, completed: c.completed, value: c.value }));
      const progress = calculateGoalProgress(
        {
          target: goal.target,
          startDate: goal.start_date,
          endDate: goal.end_date,
        },
        relevant,
      );
      return progress.progress >= 100;
    }).length;

    goals = { completed: completedCount, total: goalRows.length };
  }

  return {
    hasHabits: true,
    weekStart,
    weekEnd,
    completionRate,
    bestStreak,
    biggestImprovement,
    needsAttention,
    goals,
  };
}
