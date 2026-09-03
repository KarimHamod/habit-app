import { redirect } from "next/navigation";

import { CalendarView } from "@/components/calendar/calendar-view";
import { getMonthKey } from "@/lib/dates/date-string";
import { getTodayDateString } from "@/lib/dates/timezone";
import { getMonthCalendarData } from "@/lib/habits/month-calendar-data";
import { monthRange } from "@/lib/habits/stats";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const { month } = await searchParams;
  const monthKey =
    month && /^\d{4}-\d{2}$/.test(month) ? month : getMonthKey(today);

  const { start, end } = monthRange(`${monthKey}-01`);
  const days = await getMonthCalendarData(user.id, start, end, today);

  return (
    // Keyed on monthKey so navigating months remounts the view instead of
    // carrying over a selectedDate that no longer exists in the new grid.
    <CalendarView
      key={monthKey}
      days={days}
      monthKey={monthKey}
      today={today}
      weekStartsOn={weekStartsOn}
    />
  );
}
