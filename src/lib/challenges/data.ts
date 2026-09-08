import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import {
  aggregateCompletionSummary,
  rankHabitPerformanceInRange,
  type HabitWithHistory,
} from "@/lib/insights/aggregate";
import { createClient } from "@/lib/supabase/server";

import { challengeDayNumber, challengeEndDate, isChallengeActive } from "./status";
import type { ChallengeDetail, ChallengeProgress, ChallengeSummary } from "./types";

interface ChallengeRow {
  id: string;
  name: string;
  start_date: string;
  duration_days: number;
}

async function loadLinkedHabits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<HabitWithHistory[]> {
  const { data: linkRows } = await supabase
    .from("challenge_habits")
    .select("habit_id, habits(id, name, color, start_date, end_date)")
    .eq("challenge_id", challengeId);

  const habitRows = (linkRows ?? [])
    .map((row) => row.habits)
    .filter((h): h is NonNullable<typeof h> => h !== null);

  if (habitRows.length === 0) return [];

  const habitIds = habitRows.map((h) => h.id);

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

  return habitRows.map((habit) => ({
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
}

function toProgress(
  row: ChallengeRow,
  today: string,
  weekStartsOn: 0 | 1,
  habits: HabitWithHistory[],
  rangeEnd: string,
): Omit<ChallengeProgress, "dayNumber"> & { dayNumber: number } {
  const { rate } = aggregateCompletionSummary(
    habits,
    row.start_date,
    rangeEnd,
    weekStartsOn,
  );
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    durationDays: row.duration_days,
    dayNumber: challengeDayNumber(row.start_date, today),
    rate,
    habits: rankHabitPerformanceInRange(
      habits,
      row.start_date,
      rangeEnd,
      today,
      weekStartsOn,
    ),
  };
}

export async function getActiveChallenge(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<ChallengeProgress | null> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId);

  const active = (rows ?? []).find((row) =>
    isChallengeActive(row.start_date, row.duration_days, today),
  );
  if (!active) return null;

  const habits = await loadLinkedHabits(
    supabase,
    active.id,
    active.start_date,
    today,
  );
  return toProgress(active, today, weekStartsOn, habits, today);
}

export async function getChallengeById(
  userId: string,
  challengeId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<ChallengeDetail | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId)
    .eq("id", challengeId)
    .maybeSingle();

  if (!row) return null;

  const endDate = challengeEndDate(row.start_date, row.duration_days);
  const active = isChallengeActive(row.start_date, row.duration_days, today);
  const rangeEnd = active ? today : endDate;

  const habits = await loadLinkedHabits(
    supabase,
    row.id,
    row.start_date,
    rangeEnd,
  );

  return {
    ...toProgress(row, today, weekStartsOn, habits, rangeEnd),
    isActive: active,
    endDate,
  };
}

export async function listPastChallenges(
  userId: string,
  today: string,
): Promise<ChallengeSummary[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  const ended = (rows ?? []).filter(
    (row) => !isChallengeActive(row.start_date, row.duration_days, today),
  );

  const summaries = await Promise.all(
    ended.map(async (row) => {
      const endDate = challengeEndDate(row.start_date, row.duration_days);
      const habits = await loadLinkedHabits(
        supabase,
        row.id,
        row.start_date,
        endDate,
      );
      const { rate } = aggregateCompletionSummary(
        habits,
        row.start_date,
        endDate,
        1,
      );
      return { id: row.id, name: row.name, startDate: row.start_date, endDate, rate };
    }),
  );

  return summaries;
}
