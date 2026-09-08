import { redirect } from "next/navigation";
import Link from "next/link";

import { getActiveChallenge, listPastChallenges } from "@/lib/challenges/data";
import { getTodayDateString } from "@/lib/dates/timezone";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitPerformanceList } from "@/components/insights/habit-performance-list";

export default async function ChallengesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const [active, past] = await Promise.all([
    getActiveChallenge(user.id, today, weekStartsOn),
    listPastChallenges(user.id, today),
  ]);

  if (!active && past.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          <Button
            nativeButton={false}
            render={<Link href="/challenges/new">New challenge</Link>}
          />
        </div>
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">No challenges yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Bundle a few habits into a fixed-length challenge to focus on
            them together.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        {!active ? (
          <Button
            nativeButton={false}
            render={<Link href="/challenges/new">New challenge</Link>}
          />
        ) : null}
      </div>

      {active ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Link href={`/challenges/${active.id}`}>{active.name}</Link>
              <span className="text-muted-foreground text-sm font-normal">
                Day {active.dayNumber} of {active.durationDays}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-medium">
              {Math.round(active.rate)}% so far
            </p>
            <HabitPerformanceList
              title="Linked habits"
              items={active.habits}
              emptyMessage="No habits linked"
            />
          </CardContent>
        </Card>
      ) : null}

      {past.length > 0 ? (
        <div className="rounded-xl border">
          <p className="border-b p-4 text-sm font-medium">Past challenges</p>
          <ul className="divide-y">
            {past.map((challenge) => (
              <li key={challenge.id} className="px-4 py-3">
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm">{challenge.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {Math.round(challenge.rate)}% completed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
