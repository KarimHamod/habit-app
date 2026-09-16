import { createClient } from "@/lib/supabase/server";

import { sortByDueDate } from "./due-date";
import type { Todo } from "./types";

interface TodoRow {
  id: string;
  title: string;
  done_at: string | null;
  parked: boolean;
  due_date: string | null;
  due_time: string | null;
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done_at !== null,
    parked: row.parked,
    dueDate: row.due_date,
    // Postgres returns 'time' as 'HH:MM:SS' — trim to 'HH:mm' so it compares
    // and sorts consistently with the 'HH:mm' the UI reads and writes.
    dueTime: row.due_time !== null ? row.due_time.slice(0, 5) : null,
  };
}

/**
 * Loads a user's to-dos split into active and parked ("Later this week")
 * lists, oldest first within each. One query; the split happens in memory
 * since both lists are typically small and RLS already scopes the row set
 * to this user.
 */
export async function listTodos(
  userId: string,
): Promise<{ active: Todo[]; parked: Todo[] }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("todos")
    .select("id, title, done_at, parked, due_date, due_time")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const todos = (data ?? []).map(toTodo);

  return {
    // Soonest-due first; todos with no due date keep the creation order
    // they already had, after every dated todo.
    active: sortByDueDate(todos.filter((todo) => !todo.parked)),
    parked: todos.filter((todo) => todo.parked),
  };
}
