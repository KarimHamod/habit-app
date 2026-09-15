import { createClient } from "@/lib/supabase/server";

import type { Todo } from "./types";

interface TodoRow {
  id: string;
  title: string;
  done_at: string | null;
  parked: boolean;
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done_at !== null,
    parked: row.parked,
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
    .select("id, title, done_at, parked")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const todos = (data ?? []).map(toTodo);

  return {
    active: todos.filter((todo) => !todo.parked),
    parked: todos.filter((todo) => todo.parked),
  };
}
