"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/auth";

export type ProfileActionState = {
  error?: string;
  success?: boolean;
};

async function saveProfileFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  data: OnboardingInput,
) {
  return supabase
    .from("profiles")
    .update({
      display_name: data.displayName,
      timezone: data.timezone,
      week_starts_on: data.weekStartsOn,
    })
    .eq("id", userId);
}

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

  const { error } = await saveProfileFields(supabase, user.id, parsed.data);

  if (error) {
    return { error: "Couldn't save your profile. Try again." };
  }

  redirect("/today");
}

export async function updateProfile(
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

  const { error } = await saveProfileFields(supabase, user.id, parsed.data);

  if (error) {
    return { error: "Couldn't save your settings. Try again." };
  }

  // timezone and week_starts_on drive "today" boundaries and week grouping
  // on these pages, so a stale Router Cache entry would show data computed
  // under the old settings until the user hard-reloads.
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/insights");
  revalidatePath("/insights/weekly");
  return { success: true };
}
