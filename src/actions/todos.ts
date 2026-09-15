"use server";

import { revalidatePath } from "next/cache";

import { todoTitleSchema } from "@/lib/todos/validation";
import { createClient } from "@/lib/supabase/server";

export type TodoActionResult = { success: true } | { error: string };
export type CreateTodoResult = { success: true; id: string } | { error: string };

/**
 * Adds a to-do for the authenticated user. Title is the only user input,
 * so it's the only thing validated here. Returns the new row's id so the
 * client can replace its optimistic placeholder without a full reload.
 */
export async function createTodo(title: string): Promise<CreateTodoResult> {
  const parsed = todoTitleSchema.safeParse(title);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid title" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, title: parsed.data })
    .select("id")
    .single();

  if (error || !data) return { error: "Couldn't add that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true, id: data.id };
}

/**
 * Marks a to-do done or not done. `done_at` (not a boolean) matches
 * `habit_completions.completed_at` — unused for display today, but avoids
 * a future migration if a "completed at" timestamp is ever wanted.
 */
export async function toggleTodo(
  id: string,
  done: boolean,
): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("todos")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't update that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true };
}

/** Moves a to-do into or out of the "Later" section. */
export async function parkTodo(
  id: string,
  parked: boolean,
): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("todos")
    .update({ parked })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't update that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true };
}

export async function deleteTodo(id: string): Promise<TodoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't remove that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true };
}
