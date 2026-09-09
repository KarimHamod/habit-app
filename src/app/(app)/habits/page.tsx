import { redirect } from "next/navigation";

import { HabitsList, type HabitRow } from "@/components/habits/habits-list";
import { RITUALS_TABS } from "@/components/nav/section-tab-items";
import { SectionTabs } from "@/components/nav/section-tabs";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export default async function HabitsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [
    { data: habits, error: habitsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("habits")
      .select(
        "*, habit_schedules(days_of_week, times_per_period), categories(id, name, color)",
      )
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  if (habitsError || categoriesError) {
    throw new Error("Couldn't load your habits");
  }

  const rows: HabitRow[] = (habits ?? []).map((habit) => ({
    ...habit,
    type: habit.type as HabitRow["type"],
    frequency_type: habit.frequency_type as HabitRow["frequency_type"],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto w-full max-w-lg px-4 pt-4">
        <SectionTabs items={RITUALS_TABS} />
      </div>
      <HabitsList habits={rows} categories={categories ?? []} />
    </div>
  );
}
