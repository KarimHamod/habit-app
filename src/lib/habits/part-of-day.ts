/**
 * Which stretch of the user's day a habit belongs to. This is a grouping
 * hint for the Today list only — it never participates in scheduling,
 * streak calculation, or completion history.
 */
export type PartOfDay = "morning" | "afternoon" | "evening" | "anytime";

/**
 * Display order for the Today sections. "anytime" sorts last so unassigned
 * habits fall below the ones the user has actually placed in their day.
 */
export const PART_OF_DAY_ORDER = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
] as const satisfies readonly PartOfDay[];

export const PART_OF_DAY_LABELS: Record<PartOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

export function isPartOfDay(value: string | null): value is PartOfDay {
  return (
    value !== null && (PART_OF_DAY_ORDER as readonly string[]).includes(value)
  );
}

export type PartOfDayGroup<T> = { part: PartOfDay; habits: T[] };

/**
 * Buckets habits into the fixed PART_OF_DAY_ORDER sequence, preserving the
 * caller's relative order within each bucket. Empty buckets are omitted so
 * the Today page never renders a heading with nothing under it.
 */
export function groupHabitsByPartOfDay<T extends { partOfDay: PartOfDay }>(
  habits: T[],
): PartOfDayGroup<T>[] {
  const buckets = new Map<PartOfDay, T[]>();

  for (const habit of habits) {
    const bucket = buckets.get(habit.partOfDay);
    if (bucket) {
      bucket.push(habit);
    } else {
      buckets.set(habit.partOfDay, [habit]);
    }
  }

  const groups: PartOfDayGroup<T>[] = [];
  for (const part of PART_OF_DAY_ORDER) {
    const bucket = buckets.get(part);
    if (bucket && bucket.length > 0) {
      groups.push({ part, habits: bucket });
    }
  }

  return groups;
}
