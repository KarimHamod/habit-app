import { addDays, compareDateStrings } from "@/lib/dates/date-string";

/** Last day of the challenge (inclusive), as a date string. */
export function challengeEndDate(
  startDate: string,
  durationDays: number,
): string {
  return addDays(startDate, durationDays - 1);
}

/** 1-indexed day number for `today` within the challenge (day 1 = startDate). */
export function challengeDayNumber(startDate: string, today: string): number {
  let count = 1;
  let cursor = startDate;
  while (compareDateStrings(cursor, today) < 0) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}

/** Whether `today` falls within [startDate, challengeEndDate(startDate, durationDays)]. */
export function isChallengeActive(
  startDate: string,
  durationDays: number,
  today: string,
): boolean {
  const endDate = challengeEndDate(startDate, durationDays);
  return (
    compareDateStrings(startDate, today) <= 0 &&
    compareDateStrings(today, endDate) <= 0
  );
}
