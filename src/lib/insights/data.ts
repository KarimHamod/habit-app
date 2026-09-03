import { addDays, getWeekStart } from "@/lib/dates/date-string";
import { calculateGoalProgress, type GoalProgress } from "@/lib/habits/goal";
import {
  groupScheduleVersionsByHabit,
  isHabitScheduledOnDate,
} from "@/lib/habits/schedule";
import { monthRange } from "@/lib/habits/stats";
import { calculateRangeCompletion } from "@/lib/habits/streak";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import { createClient } from "@/lib/supabase/server";

import {
  aggregateCompletionRate,
  buildWeeklyConsistency,
  rankHabitPerformance,
  type HabitPerformance,
  type HabitWithHistory,
  type WeeklyConsistencyPoint,
} from "./aggregate";
import { generateInsights, type Insight } from "./engine";

const NEEDS_ATTENTION_THRESHOLD = 70;
const MAX_LIST_LENGTH = 5;
const CONSISTENCY_WEEKS = 8;

export interface GoalProgressDisplay extends GoalProgress {
  id: string;
  habitName: string;
  period: string;
}

export interface InsightsData {
  hasHabits: boolean;
  overallRate: number;
  weekTrend: { current: number; previous: number };
  monthTrend: { current: number; previous: number };
  bestHabits: HabitPerformance[];
  needsAttention: HabitPerformance[];
  consistency: WeeklyConsistencyPoint[];
  goals: GoalProgressDisplay[];
  insights: Insight[];
}

export async function getInsightsData(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<InsightsData> {
  const supabase = await createClient();

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, color, start_date, end_date")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (habitsError) {
    throw new Error("Couldn't load your habits");
  }

  if (!habitRows || habitRows.length === 0) {
    return {
      hasHabits: false,
      overallRate: 0,
      weekTrend: { current: 0, previous: 0 },
      monthTrend: { current: 0, previous: 0 },
      bestHabits: [],
      needsAttention: [],
      consistency: buildWeeklyConsistency(
        [],
        today,
        weekStartsOn,
        CONSISTENCY_WEEKS,
      ),
      goals: [],
      insights: [],
    };
  }

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds),
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
    name: habit.name,
    color: habit.color,
    schedule: {
      startDate: habit.start_date,
      endDate: habit.end_date,
      versions: versionsByHabit.get(habit.id) ?? [],
    },
    completions: completionsByHabit.get(habit.id) ?? [],
  }));

  const { start: monthStart, end: monthEndFull } = monthRange(today);
  const monthEnd = monthEndFull > today ? today : monthEndFull;
  const lastMonthAnchor = addDays(monthStart, -1);
  const { start: lastMonthStart, end: lastMonthEnd } =
    monthRange(lastMonthAnchor);

  const weekStart = getWeekStart(today, weekStartsOn);
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);

  const monthTrend = {
    current: aggregateCompletionRate(habits, monthStart, monthEnd, weekStartsOn),
    previous: aggregateCompletionRate(
      habits,
      lastMonthStart,
      lastMonthEnd,
      weekStartsOn,
    ),
  };
  const weekTrend = {
    current: aggregateCompletionRate(habits, weekStart, today, weekStartsOn),
    previous: aggregateCompletionRate(
      habits,
      lastWeekStart,
      lastWeekEnd,
      weekStartsOn,
    ),
  };

  const ranked = rankHabitPerformance(habits, today, weekStartsOn);
  const bestHabits = ranked.slice(0, MAX_LIST_LENGTH);
  // Excludes habits with nothing scheduled yet in the window (e.g. created
  // today) — their rate is 0 for lack of a denominator, not because they
  // were missed, so they shouldn't read as "needs attention".
  const needsAttention = ranked
    .filter((h) => h.scheduledCount > 0 && h.rate < NEEDS_ATTENTION_THRESHOLD)
    .slice(0, MAX_LIST_LENGTH);

  const consistency = buildWeeklyConsistency(
    habits,
    today,
    weekStartsOn,
    CONSISTENCY_WEEKS,
  );

  const todayHabits = habits.filter((h) =>
    isHabitScheduledOnDate(h.schedule, today),
  );
  const allHabitsCompletedToday =
    todayHabits.length > 0 &&
    todayHabits.every((h) =>
      h.completions.some((c) => c.date === today && c.completed),
    );

  // Skips habits with nothing scheduled this month (e.g. created today) —
  // there's no real trend to report yet, just a 0% rate from an empty
  // denominator, which would otherwise misread as "got harder to maintain".
  const habitTrends = habits
    .filter(
      (h) =>
        calculateRangeCompletion(
          h.schedule,
          h.completions,
          monthStart,
          monthEnd,
          weekStartsOn,
        ).scheduled > 0,
    )
    .map((h) => ({
      name: h.name,
      delta:
        aggregateCompletionRate([h], monthStart, monthEnd, weekStartsOn) -
        aggregateCompletionRate([h], lastMonthStart, lastMonthEnd, weekStartsOn),
    }));

  const insights = generateInsights({
    overallCompletionRate: monthTrend.current,
    previousOverallCompletionRate: monthTrend.previous,
    allHabitsCompletedToday,
    hasHabitsToday: todayHabits.length > 0,
    habitStreaks: ranked.map((h) => ({
      name: h.name,
      currentStreak: h.currentStreak,
    })),
    habitTrends,
  });

  const { data: goalRows } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .lte("start_date", today)
    .gte("end_date", today)
    .not("habit_id", "is", null);

  let goals: GoalProgressDisplay[] = [];
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
      .in("habit_id", goalHabitIds);

    const habitNameById = new Map(habitRows.map((h) => [h.id, h.name]));

    goals = goalRows
      .filter((g) => g.habit_id != null)
      .map((goal) => {
        const relevant: HabitCompletionRecord[] = (goalCompletions ?? [])
          .filter((c) => c.habit_id === goal.habit_id)
          .map((c) => ({
            date: c.date,
            completed: c.completed,
            value: c.value,
          }));
        const progress = calculateGoalProgress(
          {
            target: goal.target,
            startDate: goal.start_date,
            endDate: goal.end_date,
          },
          relevant,
        );
        return {
          id: goal.id,
          habitName:
            habitNameById.get(goal.habit_id as string) ?? "Unknown habit",
          period: goal.period,
          ...progress,
        };
      });
  }

  return {
    hasHabits: true,
    overallRate: monthTrend.current,
    weekTrend,
    monthTrend,
    bestHabits,
    needsAttention,
    consistency,
    goals,
    insights,
  };
}
