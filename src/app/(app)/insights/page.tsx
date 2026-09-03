import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConsistencyChart } from "@/components/insights/consistency-chart";
import { GoalProgressList } from "@/components/insights/goal-progress-list";
import { HabitPerformanceList } from "@/components/insights/habit-performance-list";
import { InsightCallouts } from "@/components/insights/insight-callouts";
import { ProgressSummary } from "@/components/insights/progress-summary";
import { getTodayDateString } from "@/lib/dates/timezone";
import { getInsightsData } from "@/lib/insights/data";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function InsightsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const data = await getInsightsData(user.id, today, weekStartsOn);

  if (!data.hasHabits) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No habits yet.</p>
          <p className="text-muted-foreground text-sm">
            Create one to start seeing insights.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/habits/new">Create Habit</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/insights/weekly" />}
        >
          Weekly review
        </Button>
      </div>

      <ProgressSummary
        overallRate={data.overallRate}
        weekTrend={data.weekTrend}
        monthTrend={data.monthTrend}
      />

      <InsightCallouts insights={data.insights} />

      <HabitPerformanceList
        title="Best habits"
        items={data.bestHabits}
        emptyMessage="Complete a few habits to see your best performers."
      />

      <HabitPerformanceList
        title="Needs attention"
        items={data.needsAttention}
        emptyMessage="Nothing needs attention — great work!"
      />

      <GoalProgressList goals={data.goals} />

      <ConsistencyChart points={data.consistency} />
    </div>
  );
}
