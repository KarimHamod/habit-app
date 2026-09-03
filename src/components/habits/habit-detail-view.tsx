import { Flame, Trophy } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { HabitDetail } from "@/lib/habits/detail";
import { describeFrequency } from "@/lib/habits/format";

import { MiniCalendar } from "./mini-calendar";

function formatCompletionValue(
  habit: HabitDetail,
  value: number | null,
): string {
  if (habit.type === "boolean") return "Done";
  return `${value ?? 0}${habit.unit ? ` ${habit.unit}` : ""}`;
}

function formatRecentDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatMonthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

interface HabitDetailViewProps {
  habit: HabitDetail;
  today: string;
  weekStartsOn: 0 | 1;
}

export function HabitDetailView({
  habit,
  today,
  weekStartsOn,
}: HabitDetailViewProps) {
  const { stats } = habit;
  const trendDelta = Math.round(stats.trend.delta);
  const hasHistory = stats.totalCompletions > 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/habits" />}
        >
          ← Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/habits/${habit.id}/edit`} />}
        >
          Edit
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{
            backgroundColor: habit.color ?? "var(--color-muted-foreground)",
          }}
          aria-hidden="true"
        >
          {habit.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{habit.name}</h1>
          <p className="text-muted-foreground text-sm">
            {describeFrequency(
              habit.frequencyType,
              habit.daysOfWeek,
              habit.timesPerPeriod,
            )}
          </p>
          {habit.categoryName ? (
            <Badge variant="secondary" className="mt-1">
              {habit.categoryName}
            </Badge>
          ) : null}
        </div>
        {habit.isArchived ? (
          <Badge variant="secondary" className="ml-auto shrink-0">
            Archived
          </Badge>
        ) : null}
      </div>

      {!hasHistory ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          No completions yet. Complete this habit to start your streak.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl border p-4 text-center">
          <Flame className="size-5 text-orange-500" aria-hidden="true" />
          <p className="text-2xl font-bold">{stats.currentStreak}</p>
          <p className="text-muted-foreground text-xs">Current streak</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border p-4 text-center">
          <Trophy className="size-5 text-amber-500" aria-hidden="true" />
          <p className="text-2xl font-bold">{stats.longestStreak}</p>
          <p className="text-muted-foreground text-xs">Longest streak</p>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold">
            {Math.round(stats.completionRate)}%
          </p>
          <p className="text-muted-foreground text-sm">
            {stats.totalCompletions} total completions
          </p>
        </div>
        <p className="text-muted-foreground text-sm">Completion rate</p>
        <Progress
          value={stats.completionRate}
          className="mt-3"
          aria-label="Overall completion rate"
        />
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">This month vs last month</p>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
              <span>This month</span>
              <span>
                {stats.thisMonth.completed} / {stats.thisMonth.scheduled}
              </span>
            </div>
            <Progress value={stats.trend.thisMonthRate} />
          </div>
          <div>
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
              <span>Last month</span>
              <span>{Math.round(stats.trend.lastMonthRate)}%</span>
            </div>
            <Progress value={stats.trend.lastMonthRate} />
          </div>
        </div>
        {stats.trend.lastMonthRate > 0 || stats.trend.thisMonthRate > 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            {trendDelta === 0
              ? "Same pace as last month."
              : trendDelta > 0
                ? `↑ Up ${trendDelta}% from last month.`
                : `↓ Down ${Math.abs(trendDelta)}% from last month.`}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">{formatMonthLabel(today)}</p>
        <MiniCalendar days={habit.calendarDays} weekStartsOn={weekStartsOn} />
      </div>

      {habit.recentCompletions.length > 0 ? (
        <div className="rounded-xl border">
          <p className="border-b p-4 text-sm font-medium">Recent activity</p>
          <ul className="divide-y">
            {habit.recentCompletions.map((completion) => (
              <li
                key={completion.date}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-muted-foreground text-sm">
                    {formatRecentDate(completion.date)}
                  </p>
                  {completion.note ? (
                    <p className="text-muted-foreground truncate text-xs">
                      {completion.note}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {formatCompletionValue(habit, completion.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
