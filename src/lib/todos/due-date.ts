import { addDays, formatShortDate } from "@/lib/dates/date-string";

import type { Todo } from "./types";

// No-due-date todos sort after every dated todo, in whatever relative order
// they already had (Array#sort is stable), matching the pre-due-date behavior.
const NO_DUE_DATE_SORT_KEY = "9999-99-99 99:99";

function sortKey(todo: Todo): string {
  if (!todo.dueDate) return NO_DUE_DATE_SORT_KEY;
  return `${todo.dueDate} ${todo.dueTime ?? "00:00"}`;
}

/** Soonest due date/time first. */
export function sortByDueDate(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
}

/**
 * A todo is overdue when its due date/time has passed relative to the
 * caller-supplied `today`/`nowTime` — always derived from the user's
 * timezone (`getTodayDateString`/`getCurrentTimeString`), never server UTC.
 * A done todo is never overdue.
 */
export function isOverdue(todo: Todo, today: string, nowTime: string): boolean {
  if (todo.done || !todo.dueDate) return false;
  if (todo.dueDate !== today) return todo.dueDate < today;
  return todo.dueTime !== null && todo.dueTime < nowTime;
}

/** "Today", "Tomorrow", or a short date, plus a time if one is set — e.g. "Today, 3:00 PM". */
export function formatDueBadge(todo: Pick<Todo, "dueDate" | "dueTime">, today: string): string | null {
  if (!todo.dueDate) return null;

  const tomorrowString = addDays(today, 1);

  const day =
    todo.dueDate === today ? "Today" : todo.dueDate === tomorrowString ? "Tomorrow" : formatShortDate(todo.dueDate);

  if (!todo.dueTime) return day;
  return `${day}, ${formatTimeOfDay(todo.dueTime)}`;
}

function formatTimeOfDay(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(1970, 0, 1, hour, minute)));
}
