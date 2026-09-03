"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeeklyConsistencyPoint } from "@/lib/insights/aggregate";

function formatWeekLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

interface ConsistencyChartProps {
  points: WeeklyConsistencyPoint[];
}

export function ConsistencyChart({ points }: ConsistencyChartProps) {
  const hasAnyData = points.some((p) => p.rate > 0);
  const data = points.map((p) => ({
    week: formatWeekLabel(p.weekStart),
    rate: Math.round(p.rate),
  }));

  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 text-sm font-medium">Consistency over time</p>
      {!hasAnyData ? (
        <p className="text-muted-foreground text-sm">
          No completions yet in the last {points.length} weeks — this fills in
          as you log habits.
        </p>
      ) : (
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                formatter={(value) => [`${value}%`, "Completion rate"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Bar
                dataKey="rate"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
