import { redirect } from "next/navigation";

import { HabitForm } from "@/components/habits/habit-form";
import { getTodayDateString } from "@/lib/dates/timezone";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function NewHabitPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ]);
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name");

  return (
    <HabitForm
      mode="create"
      categories={categories ?? []}
      defaultStartDate={getTodayDateString(profile?.timezone ?? "UTC")}
    />
  );
}
