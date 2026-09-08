"use server";

import { redirect } from "next/navigation";

import { challengeSchema } from "@/lib/challenges/validation";
import { createClient } from "@/lib/supabase/server";

export type ChallengeActionState = {
  error?: string;
};

export async function createChallenge(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const parsed = challengeSchema.safeParse({
    name: formData.get("name"),
    durationDays: formData.get("durationDays"),
    habitIds: formData.getAll("habitIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Re-check ownership of every submitted habit id server-side — never
  // trust that a client-submitted id actually belongs to this user.
  const { data: ownedHabits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .in("id", parsed.data.habitIds);

  const ownedIds = new Set((ownedHabits ?? []).map((h) => h.id));
  const allOwned = parsed.data.habitIds.every((id) => ownedIds.has(id));
  if (!allOwned) {
    return { error: "One of the selected habits couldn't be found" };
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({ user_id: user.id, name: parsed.data.name, duration_days: parsed.data.durationDays })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    // The one-active-challenge trigger surfaces here as a Postgres error;
    // Supabase's JS client reports it as a generic insert failure, so give
    // a specific, friendly message rather than the raw trigger text.
    return { error: "You already have an active challenge — finish or cancel it first." };
  }

  const { error: linkError } = await supabase
    .from("challenge_habits")
    .insert(parsed.data.habitIds.map((habitId) => ({ challenge_id: challenge.id, habit_id: habitId })));

  if (linkError) {
    // Compensating rollback, same shape as createHabit's — no multi-table
    // transaction available through the Supabase client API.
    await supabase.from("challenges").delete().eq("id", challenge.id);
    return { error: "Couldn't link the selected habits" };
  }

  redirect(`/challenges/${challenge.id}`);
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId)
    .eq("user_id", user.id);

  redirect("/challenges");
}
