import { notFound, redirect } from "next/navigation";

import { HabitDetailView } from "@/components/habits/habit-detail-view";
import { getTodayDateString } from "@/lib/dates/timezone";
import { getHabitDetail } from "@/lib/habits/detail";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const { habitId } = await params;
  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const habit = await getHabitDetail(habitId, user.id, today, weekStartsOn);
  if (!habit) {
    notFound();
  }

  return (
    <HabitDetailView habit={habit} today={today} weekStartsOn={weekStartsOn} />
  );
}
