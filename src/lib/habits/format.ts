import type { FrequencyType } from "./types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

/** Human-readable summary of a habit's schedule, e.g. "Every day", "Weekdays", "Mon, Wed, Fri", "3x per week". */
export function describeFrequency(
  frequencyType: FrequencyType,
  daysOfWeek?: number[] | null,
  timesPerPeriod?: number | null,
): string {
  if (frequencyType === "daily") return "Every day";
  if (frequencyType === "weekly") return `${timesPerPeriod ?? 0}x per week`;

  const days = daysOfWeek ?? [];
  if (days.length === 0) return "No days selected";

  const sorted = [...days].sort((a, b) => a - b);
  if (
    sorted.length === WEEKDAY_VALUES.length &&
    sorted.every((d, i) => d === WEEKDAY_VALUES[i])
  ) {
    return "Weekdays";
  }

  return sorted.map((d) => DAY_LABELS[d]).join(", ");
}
