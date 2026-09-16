/**
 * A personal to-do item, independent of the habit system. `done` is
 * derived from `done_at` being non-null — callers never see the
 * timestamp itself, only whether the item is checked off.
 */
export interface Todo {
  id: string;
  title: string;
  done: boolean;
  parked: boolean;
  /** 'YYYY-MM-DD', or null if this todo has no due date. */
  dueDate: string | null;
  /** 'HH:mm' (24-hour), or null. Always null when `dueDate` is null. */
  dueTime: string | null;
}
