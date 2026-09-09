import { redirect } from "next/navigation";

import { TodayView } from "@/components/today/today-view";
import { getActiveChallenge } from "@/lib/challenges/data";
import { formatFriendlyDate } from "@/lib/dates/date-string";
import { getDaypartGreeting, getTodayDateString } from "@/lib/dates/timezone";
import { getTodayHabits } from "@/lib/habits/today";
import { getCompanionGrowth } from "@/lib/insights/companion";
import { getWeeklyFlow } from "@/lib/insights/weekly-flow";
import { getReflectionForDate } from "@/lib/reflections/data";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

// The greeting is the visible heading; this names the route in the browser
// tab and history with the section's full Sprout & Bloom name.
export const metadata = { title: "Today's Rituals" };

export default async function TodayPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const date = getTodayDateString(timezone);

  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const [habits, weeklyFlow, companion, activeChallenge, reflection] =
    await Promise.all([
      getTodayHabits(user.id, date),
      getWeeklyFlow(user.id, date, weekStartsOn),
      getCompanionGrowth(user.id, date, weekStartsOn),
      getActiveChallenge(user.id, date, weekStartsOn),
      getReflectionForDate(user.id, date),
    ]);

  return (
    <TodayView
      initialHabits={habits}
      date={date}
      timezone={timezone}
      displayName={profile?.display_name ?? null}
      daypart={getDaypartGreeting(timezone)}
      friendlyDate={formatFriendlyDate(date)}
      weeklyFlow={weeklyFlow.days}
      weekConsistency={weeklyFlow.consistency}
      companionStage={companion.stage}
      companionRate={companion.rate}
      activeChallenge={activeChallenge}
      reflection={reflection}
    />
  );
}
