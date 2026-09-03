/**
 * The one place a wall-clock Date gets converted into the user's calendar
 * day. Everything downstream in the habits domain works with the resulting
 * 'YYYY-MM-DD' string, never with Date objects, to stay DST-safe.
 */
export function toZonedDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTodayDateString(timeZone: string): string {
  return toZonedDateString(new Date(), timeZone);
}

export type DaypartGreeting = "morning" | "afternoon" | "evening";

/** Returns a semantic daypart, not copy — the UI layer composes "Good morning" etc. */
export function getDaypartGreeting(
  timeZone: string,
  now: Date = new Date(),
): DaypartGreeting {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
