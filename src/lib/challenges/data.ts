import { compareDateStrings } from "@/lib/dates/date-string";
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

interface ChallengeRange {
  id: string;
  rangeStart: string;
  rangeEnd: string;
}

/**
 * Loads each linked habit's completion history and schedule for one or more
 * challenges in a constant number of queries (regardless of how many
 * challenges are passed): one join query for the habit links, plus one
 * completions query and one schedule-versions query covering the union of
 * all involved habits and date ranges. Each challenge's completions are
 * then filtered back down to its own [rangeStart, rangeEnd] window in
 * memory, since ended challenges can have different date ranges.
 *
 * Callers with a single challenge (getActiveChallenge, getChallengeById)
 * get the same per-habit result as before — this is just the N=1 case of
 * the same batching.
 */
async function loadHabitsForChallenges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challenges: ChallengeRange[],
): Promise<Map<string, HabitWithHistory[]>> {
  const result = new Map<string, HabitWithHistory[]>();
  if (challenges.length === 0) return result;

  const challengeIds = challenges.map((c) => c.id);

  const { data: linkRows } = await supabase
    .from("challenge_habits")
    .select("challenge_id, habits(id, name, color, start_date, end_date)")
    .in("challenge_id", challengeIds);

  const habitRowsByChallenge = new Map<
    string,
    NonNullable<NonNullable<(typeof linkRows)>[number]["habits"]>[]
  >();
  const habitIds = new Set<string>();
  for (const row of linkRows ?? []) {
    if (!row.habits) continue;
    const list = habitRowsByChallenge.get(row.challenge_id) ?? [];
    list.push(row.habits);
    habitRowsByChallenge.set(row.challenge_id, list);
    habitIds.add(row.habits.id);
  }

  if (habitIds.size === 0) {
    for (const challenge of challenges) result.set(challenge.id, []);
    return result;
  }

  const habitIdList = [...habitIds];
  const overallStart = challenges
    .map((c) => c.rangeStart)
    .reduce((a, b) => (compareDateStrings(a, b) <= 0 ? a : b));
  const overallEnd = challenges
    .map((c) => c.rangeEnd)
    .reduce((a, b) => (compareDateStrings(a, b) >= 0 ? a : b));

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIdList)
        .gte("date", overallStart)
        .lte("date", overallEnd),
      supabase
        .from("habit_schedule_versions")
        .select(
          "habit_id, frequency_type, days_of_week, times_per_period, effective_from, effective_until",
        )
        .in("habit_id", habitIdList),
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

  for (const challenge of challenges) {
    const habitRows = habitRowsByChallenge.get(challenge.id) ?? [];
    const habits = habitRows.map((habit) => ({
      id: habit.id,
      name: habit.name,
      color: habit.color,
      schedule: {
        startDate: habit.start_date,
        endDate: habit.end_date,
        versions: versionsByHabit.get(habit.id) ?? [],
      },
      completions: (completionsByHabit.get(habit.id) ?? []).filter(
        (completion) =>
          compareDateStrings(completion.date, challenge.rangeStart) >= 0 &&
          compareDateStrings(completion.date, challenge.rangeEnd) <= 0,
      ),
    }));
    result.set(challenge.id, habits);
  }

  return result;
}

async function loadLinkedHabits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<HabitWithHistory[]> {
  const habitsByChallenge = await loadHabitsForChallenges(supabase, [
    { id: challengeId, rangeStart, rangeEnd },
  ]);
  return habitsByChallenge.get(challengeId) ?? [];
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

  const endedWithEndDate = ended.map((row) => ({
    row,
    endDate: challengeEndDate(row.start_date, row.duration_days),
  }));

  // One batched round trip for all ended challenges' habits, instead of
  // one loadLinkedHabits call per challenge — see loadHabitsForChallenges.
  const habitsByChallenge = await loadHabitsForChallenges(
    supabase,
    endedWithEndDate.map(({ row, endDate }) => ({
      id: row.id,
      rangeStart: row.start_date,
      rangeEnd: endDate,
    })),
  );

  return endedWithEndDate.map(({ row, endDate }) => {
    const habits = habitsByChallenge.get(row.id) ?? [];
    const { rate } = aggregateCompletionSummary(
      habits,
      row.start_date,
      endDate,
      1,
    );
    return { id: row.id, name: row.name, startDate: row.start_date, endDate, rate };
  });
}
