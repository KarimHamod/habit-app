import { addDays } from "@/lib/dates/date-string";
import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import { createClient } from "@/lib/supabase/server";

import { aggregateCompletionSummary, type HabitWithHistory } from "./aggregate";
import { growthStageFor, type GrowthStage } from "./growth";

export interface CompanionGrowth {
  stage: GrowthStage;
  rate: number;
  windowDays: number;
}

/**
 * Trailing-window (default 30 days) completion rate, mapped to a companion
 * growth stage, for the Today page's side-rail widget. Secondary/non-critical
 * content — on any missing data it degrades to stage 0 rather than throwing,
 * the same posture as getWeeklyFlow, so a query hiccup here never breaks the
 * rest of the Today page.
 */
export async function getCompanionGrowth(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
  windowDays = 30,
): Promise<CompanionGrowth> {
  const rangeStart = addDays(today, -(windowDays - 1));

  const supabase = await createClient();

  const { data: habitRows } = await supabase
    .from("habits")
    .select("id, start_date, end_date")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!habitRows || habitRows.length === 0) {
    return { stage: 0, rate: 0, windowDays };
  }

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .gte("date", rangeStart)
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

  const { scheduled, rate } = aggregateCompletionSummary(
    habits,
    rangeStart,
    today,
    weekStartsOn,
  );

  return { stage: growthStageFor(rate, scheduled), rate, windowDays };
}
