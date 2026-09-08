import { Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDayOfWeek } from "@/lib/dates/date-string";
import type { DailyFlowPoint } from "@/lib/insights/aggregate";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WeeklyFlowCardProps {
  flow: DailyFlowPoint[];
  consistency: number;
}

/** Side-rail widget on the Today page: this week's completion at a glance, one dot per day. */
export function WeeklyFlowCard({ flow, consistency }: WeeklyFlowCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Weekly Flow</span>
          <span className="text-muted-foreground text-sm font-normal">
            {Math.round(consistency)}% consistency
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-1">
          {flow.map((day) => {
            const dayOfWeek = getDayOfWeek(day.date);
            const hasSchedule = day.scheduled > 0;
            const isComplete = hasSchedule && day.completed === day.scheduled;
            const label = hasSchedule
              ? `${DAY_NAMES[dayOfWeek]}: ${day.completed} of ${day.scheduled} habits completed`
              : `${DAY_NAMES[dayOfWeek]}: nothing scheduled`;

            return (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-[11px] font-semibold"
                >
                  {DAY_LETTERS[dayOfWeek]}
                </span>
                <div
                  role="img"
                  aria-label={label}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    isComplete
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : null}
                </div>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-[10px]"
                >
                  {hasSchedule ? `${day.completed}/${day.scheduled}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
