"use server";

import { revalidatePath } from "next/cache";

import { todoDueDateSchema, todoDueTimeSchema, todoTitleSchema } from "@/lib/todos/validation";
import { requireUser } from "@/lib/supabase/server";

export type TodoActionResult = { success: true } | { error: string };
export type CreateTodoResult = { success: true; id: string } | { error: string };

/**
 * Adds a to-do for the authenticated user. `dueTime` is only meaningful
 * alongside `dueDate` (enforced by the `todo_due_time_requires_date`
 * check), so a time with no date is dropped rather than rejected. Returns
 * the new row's id so the client can replace its optimistic placeholder
 * without a full reload.
 */
export async function createTodo(
  title: string,
  dueDate?: string | null,
  dueTime?: string | null,
): Promise<CreateTodoResult> {
  const parsedTitle = todoTitleSchema.safeParse(title);
  if (!parsedTitle.success) {
    return { error: parsedTitle.error.issues[0]?.message ?? "Invalid title" };
  }

  const parsedDue = parseDueDateTime(dueDate, dueTime);
  if ("error" in parsedDue) return parsedDue;

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: user.id,
      title: parsedTitle.data,
      due_date: parsedDue.dueDate,
      due_time: parsedDue.dueTime,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Couldn't add that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true, id: data.id };
}

/** Validates an optional due date/time pair; a time with no date is dropped, not an error. */
function parseDueDateTime(
  dueDate?: string | null,
  dueTime?: string | null,
): { dueDate: string | null; dueTime: string | null } | { error: string } {
  if (!dueDate) return { dueDate: null, dueTime: null };

  const parsedDate = todoDueDateSchema.safeParse(dueDate);
  if (!parsedDate.success) return { error: "Invalid due date" };

  if (!dueTime) return { dueDate: parsedDate.data, dueTime: null };

  const parsedTime = todoDueTimeSchema.safeParse(dueTime);
  if (!parsedTime.success) return { error: "Invalid due time" };

  return { dueDate: parsedDate.data, dueTime: parsedTime.data };
}

/** Sets, changes, or clears (pass `null`) a to-do's due date/time. */
export async function setTodoDueDate(
  id: string,
  dueDate: string | null,
  dueTime?: string | null,
): Promise<TodoActionResult> {
  const parsedDue = parseDueDateTime(dueDate, dueTime);
  if ("error" in parsedDue) return parsedDue;

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("todos")
    .update({ due_date: parsedDue.dueDate, due_time: parsedDue.dueTime })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't update that to-do. Try again." };

  revalidatePath("/todos");
  return { success: true };
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
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
