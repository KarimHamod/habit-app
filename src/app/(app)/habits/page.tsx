import { redirect } from "next/navigation";

import { HabitsList, type HabitRow } from "@/components/habits/habits-list";
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

  return <HabitsList habits={rows} categories={categories ?? []} />;
}
