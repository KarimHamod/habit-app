import { redirect } from "next/navigation";

import { ChallengeForm } from "@/components/challenges/challenge-form";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export default async function NewChallengePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">New challenge</h1>
      <ChallengeForm habits={habits ?? []} />
    </div>
  );
}
