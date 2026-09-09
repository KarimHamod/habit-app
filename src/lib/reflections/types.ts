/**
 * A single day's reflection. `entryDate` is always the user's own calendar
 * day (resolved in their configured timezone), never a server UTC date.
 */
export interface Reflection {
  id: string;
  entryDate: string;
  body: string;
  updatedAt: string;
}
