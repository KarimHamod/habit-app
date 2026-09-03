import {
  Flame,
  PartyPopper,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatFriendlyDate } from "@/lib/dates/date-string";
import { getTodayDateString } from "@/lib/dates/timezone";
import { getWeeklyReviewData } from "@/lib/insights/weekly-review";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function WeeklyReviewPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const review = await getWeeklyReviewData(user.id, today, weekStartsOn);

  if (!review.hasHabits) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
        <h1 className="text-2xl font-bold tracking-tight">Your week</h1>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No habits yet.</p>
          <p className="text-muted-foreground text-sm">
            Create one to get a weekly review.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/habits/new">Create Habit</Link>}
          />
        </div>
      </div>
    );
  }

  const rate = Math.round(review.completionRate);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          nativeButton={false}
          render={<Link href="/insights" />}
        >
          ← Insights
        </Button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Your week</h1>
        <p className="text-muted-foreground text-sm">
          {formatFriendlyDate(review.weekStart)} –{" "}
          {formatFriendlyDate(review.weekEnd)}
        </p>
      </div>

      <div className="rounded-xl border p-6 text-center">
        <p className="text-5xl font-bold">{rate}%</p>
        <p className="text-muted-foreground mt-2 text-sm">
          {rate === 100
            ? "You completed every scheduled habit. Amazing work."
            : `You completed ${rate}% of your scheduled habits.`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Flame
            className="text-coral size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">
              Best streak
            </p>
            {review.bestStreak ? (
              <p className="font-medium">
                {review.bestStreak.habitName} — {review.bestStreak.streak} day
                {review.bestStreak.streak === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No active streaks this week.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border p-4">
          <TrendingUp
            className="text-primary size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">
              Biggest improvement
            </p>
            {review.biggestImprovement ? (
              <p className="font-medium">
                {review.biggestImprovement.habitName} +
                {Math.round(review.biggestImprovement.delta)}%
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nothing improved this week.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border p-4">
          <TrendingDown
            className="text-destructive size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">
              Needs attention
            </p>
            {review.needsAttention ? (
              <p className="font-medium">
                {review.needsAttention.habitName}{" "}
                {Math.round(review.needsAttention.delta)}%
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nothing declined this week.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Trophy
            className="text-amber size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">
              Goals
            </p>
            {review.goals.total > 0 ? (
              <p className="font-medium">
                {review.goals.completed} / {review.goals.total} completed
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No goals this week.
              </p>
            )}
          </div>
        </div>
      </div>

      {rate >= 90 && !review.needsAttention ? (
        <div
          role="status"
          className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-xl border p-4 text-sm"
        >
          <PartyPopper
            className="text-primary size-4 shrink-0"
            aria-hidden="true"
          />
          Strong week — keep it up.
        </div>
      ) : null}
    </div>
  );
}
