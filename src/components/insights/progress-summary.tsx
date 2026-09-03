function trendLabel(current: number, previous: number): string {
  const delta = Math.round(current - previous);
  if (delta === 0) return "Same as last period";
  return delta > 0 ? `↑ ${delta}%` : `↓ ${Math.abs(delta)}%`;
}

interface ProgressSummaryProps {
  overallRate: number;
  weekTrend: { current: number; previous: number };
  monthTrend: { current: number; previous: number };
}

export function ProgressSummary({
  overallRate,
  weekTrend,
  monthTrend,
}: ProgressSummaryProps) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Your Progress
      </p>
      <p className="mt-1 text-4xl font-bold">{Math.round(overallRate)}%</p>
      <p className="text-muted-foreground text-sm">
        Completion rate this month
      </p>
      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">This week</p>
          <p className="font-medium">
            {trendLabel(weekTrend.current, weekTrend.previous)} vs last week
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">This month</p>
          <p className="font-medium">
            {trendLabel(monthTrend.current, monthTrend.previous)} vs last month
          </p>
        </div>
      </div>
    </div>
  );
}
