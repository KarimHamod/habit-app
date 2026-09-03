import { Flame } from "lucide-react";

import type { HabitPerformance } from "@/lib/insights/aggregate";

interface HabitPerformanceListProps {
  title: string;
  items: HabitPerformance[];
  emptyMessage: string;
}

export function HabitPerformanceList({
  title,
  items,
  emptyMessage,
}: HabitPerformanceListProps) {
  return (
    <div className="rounded-xl border">
      <p className="border-b p-4 text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">{emptyMessage}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.habitId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      item.color ?? "var(--color-muted-foreground)",
                  }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm">{item.name}</span>
                {item.currentStreak > 0 ? (
                  <span className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs">
                    <Flame
                      className="text-coral size-3"
                      aria-hidden="true"
                    />
                    {item.currentStreak}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-medium">
                {Math.round(item.rate)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
