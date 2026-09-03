"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addDays, compareDateStrings } from "@/lib/dates/date-string";
import { getTodayDateString } from "@/lib/dates/timezone";
import { habitSchema, type HabitInput } from "@/lib/habits/validation";
import { createClient } from "@/lib/supabase/server";

export type HabitActionResult =
  { success: true; habitId: string } | { error: string };

function toHabitRow(input: HabitInput, userId: string) {
  return {
    user_id: userId,
    name: input.name,
    description: input.description || null,
    icon: input.icon || null,
    color: input.color || null,
    category_id: input.categoryId || null,
    type: input.type,
    target: input.target ?? null,
    unit: input.unit || null,
    frequency_type: input.frequencyType,
    start_date: input.startDate,
    end_date: input.endDate || null,
  };
}

function toScheduleRow(input: HabitInput, habitId: string) {
  return {
    habit_id: habitId,
    days_of_week: input.daysOfWeek?.length ? input.daysOfWeek : null,
    times_per_period: input.timesPerPeriod ?? null,
    reminder_enabled: input.reminderEnabled,
    reminder_time: input.reminderEnabled ? (input.reminderTime ?? null) : null,
  };
}

function toVersionRow(
  input: HabitInput,
  habitId: string,
  effectiveFrom: string,
) {
  return {
    habit_id: habitId,
    frequency_type: input.frequencyType,
    days_of_week: input.daysOfWeek?.length ? input.daysOfWeek : null,
    times_per_period: input.timesPerPeriod ?? null,
    effective_from: effectiveFrom,
    effective_until: null,
  };
}

function daysOfWeekEqual(a: number[] | null, b: number[] | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export async function createHabit(
  input: HabitInput,
): Promise<HabitActionResult> {
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .insert(toHabitRow(parsed.data, user.id))
    .select("id")
    .single();

  if (habitError || !habit) return { error: "Couldn't create your habit" };

  const { error: scheduleError } = await supabase
    .from("habit_schedules")
    .insert(toScheduleRow(parsed.data, habit.id));

  if (scheduleError) {
    // Compensating rollback — Supabase's client API has no multi-table
    // transaction, so undo the habit insert rather than leave it scheduleless.
    await supabase.from("habits").delete().eq("id", habit.id);
    return { error: "Couldn't save the habit schedule" };
  }

  const { error: versionError } = await supabase
    .from("habit_schedule_versions")
    .insert(toVersionRow(parsed.data, habit.id, parsed.data.startDate));

  if (versionError) {
    await supabase.from("habits").delete().eq("id", habit.id);
    return { error: "Couldn't save the habit schedule" };
  }

  revalidatePath("/today");
  // Redirect from the action itself rather than the client calling
  // router.push() after a truthy result — a client-side push could read a
  // Router Cache entry for /today that predates this revalidatePath call,
  // rendering stale and fresh habit lists side by side for a moment.
  redirect("/today");
}

export async function updateHabit(
  habitId: string,
  input: HabitInput,
): Promise<HabitActionResult> {
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const [{ data: profile }, { data: currentVersion }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    supabase
      .from("habit_schedule_versions")
      .select("id, frequency_type, days_of_week, times_per_period, effective_from")
      .eq("habit_id", habitId)
      .is("effective_until", null)
      .maybeSingle(),
  ]);

  // habits/habit_schedules hold "current" state for display and form
  // defaults; habit_schedule_versions (below) records what actually
  // applied when, so past streak/rate math is never rewritten by this edit.
  const { error: habitError } = await supabase
    .from("habits")
    .update(toHabitRow(parsed.data, user.id))
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (habitError) return { error: "Couldn't update your habit" };

  const { error: scheduleError } = await supabase
    .from("habit_schedules")
    .upsert(toScheduleRow(parsed.data, habitId), { onConflict: "habit_id" });

  if (scheduleError) return { error: "Couldn't save the habit schedule" };

  const newDaysOfWeek = parsed.data.daysOfWeek?.length
    ? parsed.data.daysOfWeek
    : null;
  const newTimesPerPeriod = parsed.data.timesPerPeriod ?? null;
  const scheduleChanged =
    !currentVersion ||
    currentVersion.frequency_type !== parsed.data.frequencyType ||
    !daysOfWeekEqual(currentVersion.days_of_week, newDaysOfWeek) ||
    currentVersion.times_per_period !== newTimesPerPeriod;

  if (scheduleChanged) {
    const timezone = profile?.timezone ?? "UTC";
    const today = getTodayDateString(timezone);

    if (
      currentVersion &&
      compareDateStrings(today, currentVersion.effective_from) > 0
    ) {
      // The old version already governed at least one real day — close it
      // out and start a new one from today, instead of rewriting it.
      const { error: closeError } = await supabase
        .from("habit_schedule_versions")
        .update({ effective_until: addDays(today, -1) })
        .eq("id", currentVersion.id);
      if (closeError) return { error: "Couldn't save the habit schedule" };

      const { error: versionError } = await supabase
        .from("habit_schedule_versions")
        .insert(toVersionRow(parsed.data, habitId, today));
      if (versionError) return { error: "Couldn't save the habit schedule" };
    } else if (currentVersion) {
      // The current version only started today (or later) — nothing has
      // happened under it yet, so it's safe to edit in place.
      const { error: versionError } = await supabase
        .from("habit_schedule_versions")
        .update({
          frequency_type: parsed.data.frequencyType,
          days_of_week: newDaysOfWeek,
          times_per_period: newTimesPerPeriod,
        })
        .eq("id", currentVersion.id);
      if (versionError) return { error: "Couldn't save the habit schedule" };
    } else {
      // No version row yet (habit predates schedule versioning) — create one.
      const { error: versionError } = await supabase
        .from("habit_schedule_versions")
        .insert(toVersionRow(parsed.data, habitId, parsed.data.startDate));
      if (versionError) return { error: "Couldn't save the habit schedule" };
    }
  }

  revalidatePath("/today");
  redirect("/today");
}

export type SimpleActionResult = { success: true } | { error: string };

/** Archiving preserves all history — it only flips a flag, never touches habit_completions. */
export async function archiveHabit(
  habitId: string,
): Promise<SimpleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("habits")
    .update({ is_archived: true })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't archive habit" };

  revalidatePath("/habits");
  revalidatePath("/today");
  return { success: true };
}

export async function restoreHabit(
  habitId: string,
): Promise<SimpleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("habits")
    .update({ is_archived: false })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't restore habit" };

  revalidatePath("/habits");
  revalidatePath("/today");
  return { success: true };
}

/** Permanent — cascades to habit_schedules, habit_schedule_versions and habit_completions. Callers must confirm with the user first. */
export async function deleteHabit(
  habitId: string,
): Promise<SimpleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't delete habit" };

  revalidatePath("/habits");
  revalidatePath("/today");
  return { success: true };
}
