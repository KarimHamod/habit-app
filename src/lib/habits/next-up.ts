import { PART_OF_DAY_ORDER, type PartOfDay } from "./part-of-day";

/** The minimum a habit needs to expose to be considered for "next up". */
export interface NextUpCandidate {
  completed: boolean;
  partOfDay: PartOfDay;
}

/**
 * The habit to reach for next: the first incomplete one in PART_OF_DAY_ORDER,
 * preserving the caller's relative order inside a bucket so the choice always
 * matches what the Today list actually renders.
 *
 * Derived from the live list on every render rather than stored. It has to
 * track optimistic completion toggles — and their rollback — exactly, and a
 * persisted "next" field would go stale the instant a habit is checked off.
 *
 * Returns null when nothing is left, which is also the all-complete and
 * nothing-scheduled case: callers render their own celebration/empty state
 * rather than a highlight with no habit behind it.
 */
export function pickNextHabit<T extends NextUpCandidate>(
  habits: T[],
): T | null {
  for (const part of PART_OF_DAY_ORDER) {
    for (const habit of habits) {
      if (habit.partOfDay === part && !habit.completed) {
        return habit;
      }
    }
  }

  return null;
}
