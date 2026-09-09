import { createClient } from "@/lib/supabase/server";

import type { Reflection } from "./types";

/**
 * Loads the reflection for one of the user's calendar days, or null. `date`
 * is resolved by the caller in the user's timezone; RLS still scopes every
 * query to the session's own user, and `userId` is only ever the id the
 * caller already read from the authenticated session.
 */
export async function getReflectionForDate(
  userId: string,
  date: string,
): Promise<Reflection | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reflections")
    .select("id, entry_date, body, updated_at")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    entryDate: data.entry_date,
    body: data.body,
    updatedAt: data.updated_at,
  };
}

/** Most recent reflections first, for the journal history list. */
export async function listReflections(
  userId: string,
  limit = 30,
): Promise<Reflection[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reflections")
    .select("id, entry_date, body, updated_at")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    entryDate: row.entry_date,
    body: row.body,
    updatedAt: row.updated_at,
  }));
}
