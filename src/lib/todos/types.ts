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
}
