import { notFound, redirect } from "next/navigation";

import { CancelChallengeButton } from "@/components/challenges/cancel-challenge-button";
import { HabitPerformanceList } from "@/components/insights/habit-performance-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChallengeById } from "@/lib/challenges/data";
import { getTodayDateString } from "@/lib/dates/timezone";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const challenge = await getChallengeById(user.id, id, today, weekStartsOn);
  if (!challenge) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{challenge.name}</span>
            {challenge.isActive ? (
              <CancelChallengeButton
                challengeId={challenge.id}
                challengeName={challenge.name}
              />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            {challenge.isActive
              ? `Day ${challenge.dayNumber} of ${challenge.durationDays} — ${Math.round(challenge.rate)}% so far`
              : `${Math.round(challenge.rate)}% completed over ${challenge.durationDays} days`}
          </p>
          <HabitPerformanceList
            title="Linked habits"
            items={challenge.habits}
            emptyMessage="No habits linked"
          />
        </CardContent>
      </Card>
    </div>
  );
}
