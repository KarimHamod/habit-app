import { redirect } from "next/navigation";

import { ReflectionEditor } from "@/components/journal/reflection-editor";
import { ReflectionList } from "@/components/journal/reflection-list";
import { compareDateStrings } from "@/lib/dates/date-string";
import { getTodayDateString } from "@/lib/dates/timezone";
import { getReflectionForDate, listReflections } from "@/lib/reflections/data";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const today = getTodayDateString(timezone);

  // The `date` param is user-supplied: accept it only if it is a real date
  // string that isn't in the future, otherwise fall back to today.
  const { date } = await searchParams;
  const selectedDate =
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    compareDateStrings(date, today) <= 0
      ? date
      : today;

  const [reflection, reflections] = await Promise.all([
    getReflectionForDate(user.id, selectedDate),
    listReflections(user.id, 30),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reflection Journal
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A quiet place to note how a day went.
        </p>
      </div>

      <ReflectionEditor
        key={selectedDate}
        entryDate={selectedDate}
        isToday={selectedDate === today}
        reflection={reflection}
      />

      {reflections.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">No reflections yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Write a line or two above whenever you feel like it. There is no
            streak to keep.
          </p>
        </div>
      ) : (
        <ReflectionList reflections={reflections} selectedDate={selectedDate} />
      )}
    </div>
  );
}
