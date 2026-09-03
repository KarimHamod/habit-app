"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/auth";

export type ProfileActionState = {
  error?: string;
};

export async function completeOnboarding(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    weekStartsOn: formData.get("weekStartsOn"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      week_starts_on: parsed.data.weekStartsOn,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save your profile. Try again." };
  }

  redirect("/today");
}
