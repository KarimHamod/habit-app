"use client";

import { Check, ChevronLeft, ChevronRight, Minus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatFriendlyDate,
  formatMonthYear,
  getDayOfWeek,
  shiftMonth,
} from "@/lib/dates/date-string";
import type {
  DayAggregateStatus,
  MonthCalendarDay,
} from "@/lib/habits/month-calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS_MON_FIRST = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
const WEEKDAY_LABELS_SUN_FIRST = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const STATUS_ICON_COLOR: Record<DayAggregateStatus, string> = {
  complete: "text-primary",
  partial: "text-amber-500",
  missed: "text-destructive",
  "none-scheduled": "text-transparent",
  future: "text-transparent",
};

const STATUS_CELL: Record<DayAggregateStatus, string> = {
  complete: "text-foreground",
  partial: "text-foreground",
  missed: "text-foreground",
  "none-scheduled": "text-muted-foreground/50",
  future: "text-muted-foreground/30",
};

/**
 * Status is conveyed by icon shape, not just color, so it still reads for
 * colorblind users — a plain colored dot was the only differentiator before.
 */
function StatusGlyph({ status }: { status: DayAggregateStatus }) {
  const className = cn("size-2.5", STATUS_ICON_COLOR[status]);
  if (status === "complete") {
    return <Check className={className} aria-hidden="true" />;
  }
  if (status === "partial") {
    return <Minus className={className} aria-hidden="true" />;
  }
  if (status === "missed") {
    return <X className={className} aria-hidden="true" />;
  }
  return <span className="size-2.5" aria-hidden="true" />;
}

interface CalendarViewProps {
  days: MonthCalendarDay[];
  monthKey: string;
  today: string;
  weekStartsOn: 0 | 1;
}

export function CalendarView({
  days,
  monthKey,
  today,
  weekStartsOn,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(
    () => days.find((d) => d.date === today)?.date ?? days[0]?.date,
  );

  const selectedDay = days.find((d) => d.date === selectedDate);
  const leadingBlanks =
    days.length > 0 ? (getDayOfWeek(days[0].date) - weekStartsOn + 7) % 7 : 0;
  const labels =
    weekStartsOn === 1 ? WEEKDAY_LABELS_MON_FIRST : WEEKDAY_LABELS_SUN_FIRST;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link
              href={`/calendar?month=${shiftMonth(monthKey, -1)}`}
              aria-label="Previous month"
            />
          }
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <p className="font-medium">{formatMonthYear(monthKey)}</p>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link
              href={`/calendar?month=${shiftMonth(monthKey, 1)}`}
              aria-label="Next month"
            />
          }
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div>
        <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              aria-current={day.date === today ? "date" : undefined}
              aria-pressed={day.date === selectedDate}
              aria-label={`${formatFriendlyDate(day.date)}: ${
                day.status === "none-scheduled"
                  ? "nothing scheduled"
                  : day.status
              }`}
              className={cn(
                "focus-visible:ring-ring flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-sm font-medium outline-none focus-visible:ring-2",
                STATUS_CELL[day.status],
                day.date === selectedDate && "bg-muted",
                day.date === today && "border-primary border",
              )}
            >
              {Number(day.date.slice(-2))}
              <StatusGlyph status={day.status} />
            </button>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <Check className="text-primary size-3" aria-hidden="true" /> Complete
        </span>
        <span className="flex items-center gap-1.5">
          <Minus className="size-3 text-amber-500" aria-hidden="true" /> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <X className="text-destructive size-3" aria-hidden="true" /> Missed
        </span>
      </div>

      {selectedDay ? (
        <div className="rounded-xl border">
          <p className="border-b p-4 text-sm font-medium">
            {formatFriendlyDate(selectedDay.date)}
          </p>
          {selectedDay.habits.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              No habits scheduled this day.
            </p>
          ) : (
            <ul className="divide-y">
              {selectedDay.habits.map((habit) => (
                <li
                  key={habit.habitId}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {habit.completed ? (
                    <Check
                      className="text-primary size-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <X
                      className="text-destructive size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-sm">{habit.name}</span>
                  <span className="sr-only">
                    {habit.completed ? "completed" : "not completed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
