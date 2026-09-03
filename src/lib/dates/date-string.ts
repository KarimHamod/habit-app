const MS_PER_DAY = 24 * 60 * 60 * 1000;

// All functions here operate on plain 'YYYY-MM-DD' calendar-date strings —
// never on Date/wall-clock instants — so DST transitions can't shift a
// habit's day. Timezone conversion happens exactly once, at the boundary
// (see lib/dates/timezone.ts), before a date ever reaches this module.

function toEpochDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function compareDateStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(date: string, days: number): string {
  const epoch = toEpochDay(date) + days * MS_PER_DAY;
  return new Date(epoch).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, matching Postgres/JS day-of-week numbering. */
export function getDayOfWeek(date: string): number {
  return new Date(toEpochDay(date)).getUTCDay();
}

export function enumerateDates(start: string, end: string): string[] {
  if (compareDateStrings(start, end) > 0) return [];
  const dates: string[] = [];
  for (
    let cursor = start;
    compareDateStrings(cursor, end) <= 0;
    cursor = addDays(cursor, 1)
  ) {
    dates.push(cursor);
  }
  return dates;
}

/** Start (inclusive) of the calendar week containing `date`. */
export function getWeekStart(date: string, weekStartsOn: 0 | 1 = 1): string {
  const offset = (getDayOfWeek(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

/** "Monday, August 31" — formats via UTC so the embedded calendar date never shifts by viewer timezone. */
export function formatFriendlyDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** The 'YYYY-MM' key for a 'YYYY-MM-DD' date. */
export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** Moves a 'YYYY-MM' key forward or backward by whole months, rolling over the year. */
export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (((total % 12) + 12) % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** "August 2026" from a 'YYYY-MM' key. */
export function formatMonthYear(monthKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}
