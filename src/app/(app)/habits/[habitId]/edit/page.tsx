import { notFound, redirect } from "next/navigation";

import { HabitForm } from "@/components/habits/habit-form";
import type { HabitInput } from "@/lib/habits/validation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const { habitId } = await params;
  const supabase = await createClient();

  const [
    { data: habit, error: habitError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("habits")
      .select(
        "*, habit_schedules(days_of_week, times_per_period, reminder_enabled, reminder_time)",
      )
      .eq("id", habitId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  if (habitError || categoriesError) {
    throw new Error("Couldn't load this habit");
  }
  if (!habit) {
    notFound();
  }

  const schedule = Array.isArray(habit.habit_schedules)
    ? habit.habit_schedules[0]
    : habit.habit_schedules;

  const defaultValues: Partial<HabitInput> = {
    name: habit.name,
    description: habit.description ?? undefined,
    icon: habit.icon ?? undefined,
    color: habit.color ?? undefined,
    categoryId: habit.category_id ?? undefined,
    type: habit.type as HabitInput["type"],
    target: habit.target ?? undefined,
    unit: habit.unit ?? undefined,
    frequencyType: habit.frequency_type as HabitInput["frequencyType"],
    daysOfWeek: schedule?.days_of_week ?? undefined,
    timesPerPeriod: schedule?.times_per_period ?? undefined,
    startDate: habit.start_date,
    endDate: habit.end_date ?? undefined,
    reminderEnabled: schedule?.reminder_enabled ?? false,
    reminderTime: schedule?.reminder_time ?? undefined,
  };

  return (
    <HabitForm
      mode="edit"
      habitId={habit.id}
      categories={categories ?? []}
      defaultStartDate={habit.start_date}
      defaultValues={defaultValues}
    />
  );
}
