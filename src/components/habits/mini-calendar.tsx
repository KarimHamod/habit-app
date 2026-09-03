import { getDayOfWeek } from "@/lib/dates/date-string";
import type { CalendarDay } from "@/lib/habits/calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS_MON_FIRST = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_LABELS_SUN_FIRST = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_STYLES: Record<CalendarDay["status"], string> = {
  completed: "bg-primary text-primary-foreground",
  missed: "bg-destructive/15 text-destructive",
  unscheduled: "text-muted-foreground/40",
  future: "text-muted-foreground/25",
};

const STATUS_LABELS: Record<CalendarDay["status"], string> = {
  completed: "completed",
  missed: "missed",
  unscheduled: "not scheduled",
  future: "upcoming",
};

interface MiniCalendarProps {
  days: CalendarDay[];
  weekStartsOn: 0 | 1;
}

export function MiniCalendar({ days, weekStartsOn }: MiniCalendarProps) {
  if (days.length === 0) return null;

  const leadingBlanks = (getDayOfWeek(days[0].date) - weekStartsOn + 7) % 7;
  const labels =
    weekStartsOn === 1 ? WEEKDAY_LABELS_MON_FIRST : WEEKDAY_LABELS_SUN_FIRST;

  return (
    <div>
      <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {days.map((day) => (
          <span
            key={day.date}
            title={`${day.date}: ${STATUS_LABELS[day.status]}`}
            aria-label={`${day.date}: ${STATUS_LABELS[day.status]}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md text-xs font-medium",
              STATUS_STYLES[day.status],
            )}
          >
            {Number(day.date.slice(-2))}
          </span>
        ))}
      </div>
    </div>
  );
}
