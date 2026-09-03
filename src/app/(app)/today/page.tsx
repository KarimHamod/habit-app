import { redirect } from "next/navigation";

import { TodayView } from "@/components/today/today-view";
import { formatFriendlyDate } from "@/lib/dates/date-string";
import { getDaypartGreeting, getTodayDateString } from "@/lib/dates/timezone";
import { getTodayHabits } from "@/lib/habits/today";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function TodayPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const date = getTodayDateString(timezone);

  const habits = await getTodayHabits(user.id, date);

  return (
    <TodayView
      initialHabits={habits}
      date={date}
      timezone={timezone}
      displayName={profile?.display_name ?? null}
      daypart={getDaypartGreeting(timezone)}
      friendlyDate={formatFriendlyDate(date)}
    />
  );
}
