"use server";

import { revalidatePath } from "next/cache";

import { buildCompletionPayload } from "@/lib/habits/completion";
import type { HabitType } from "@/lib/habits/types";
import { createClient } from "@/lib/supabase/server";

export type CompletionActionResult = { success: true } | { error: string };

export async function completeHabit(
  habitId: string,
  date: string,
  type: HabitType,
  value?: number,
  target?: number | null,
): Promise<CompletionActionResult> {
  const payload = buildCompletionPayload({ type, value, target });
  if ("error" in payload) return payload;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("habit_completions").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      date,
      completed: payload.completed,
      value: payload.value,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "habit_id,date" },
  );

  if (error) return { error: "Couldn't save your completion" };

  revalidatePath("/today");
  return { success: true };
}

export async function uncompleteHabit(
  habitId: string,
  date: string,
): Promise<CompletionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("date", date)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't undo that completion" };

  revalidatePath("/today");
  return { success: true };
}
