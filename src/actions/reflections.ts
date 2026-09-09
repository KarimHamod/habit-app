"use server";

import { revalidatePath } from "next/cache";

import { compareDateStrings } from "@/lib/dates/date-string";
import { getTodayDateString } from "@/lib/dates/timezone";
import { reflectionSchema } from "@/lib/reflections/validation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/session";

export type ReflectionActionState = { error?: string; success?: boolean };

export type ReflectionDeleteResult = { success: true } | { error: string };

function revalidateReflectionPaths() {
  revalidatePath("/today");
  revalidatePath("/journal");
}

/**
 * Saves (or replaces) the reflection for one of the user's calendar days.
 *
 * `entryDate` arrives from the client, so it is re-checked here against the
 * user's own "today" resolved from their configured timezone: backfilling a
 * past day is legitimate, filing one in the future is not.
 */
export async function saveReflection(
  _prevState: ReflectionActionState,
  formData: FormData,
): Promise<ReflectionActionState> {
  const parsed = reflectionSchema.safeParse({
    entryDate: formData.get("entryDate"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const profile = await getCurrentProfile();
  const today = getTodayDateString(profile?.timezone ?? "UTC");
  if (compareDateStrings(parsed.data.entryDate, today) > 0) {
    return { error: "You can't add a reflection for a future day" };
  }

  const { error } = await supabase.from("reflections").upsert(
    {
      user_id: user.id,
      entry_date: parsed.data.entryDate,
      body: parsed.data.body,
    },
    { onConflict: "user_id,entry_date" },
  );

  if (error) {
    return { error: "Couldn't save your reflection. Try again." };
  }

  revalidateReflectionPaths();
  return { success: true };
}

/**
 * Clears a day's reflection. Deleting is deliberately its own action rather
 * than "save an empty body" — the schema requires non-empty text, so an
 * accidental blank save can never silently destroy an entry.
 */
export async function deleteReflection(
  entryDate: string,
): Promise<ReflectionDeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("reflections")
    .delete()
    .eq("user_id", user.id)
    .eq("entry_date", entryDate);

  if (error) {
    return { error: "Couldn't remove your reflection. Try again." };
  }

  revalidateReflectionPaths();
  return { success: true };
}
