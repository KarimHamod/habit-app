/**
 * The accent colors a user can pick for a habit.
 *
 * These are identity colors, not design tokens — their job is to keep habits
 * telling apart at a glance, so the set stays hue-diverse rather than collapsing
 * into the Sunny Citrus family. What changed with that palette is temperature:
 * every swatch is warmed and slightly desaturated so it sits on the cream
 * surfaces instead of vibrating against them, the way the old primary-500
 * Tailwind hues did.
 *
 * Contrast is not fixed per swatch: `getAccentForegroundColor` picks white or
 * near-black per color, so any hex here stays legible under its lettering.
 */
export const HABIT_COLOR_SWATCHES = [
  "#c65f1c", // ember
  "#f5b025", // lemon
  "#2e8b57", // fern
  "#2a8a7a", // teal
  "#7c5295", // plum
  "#bf5480", // rose
  "#b8442f", // clay
  "#7a6a55", // taupe
] as const;

export type HabitColor = (typeof HABIT_COLOR_SWATCHES)[number];

/**
 * Maps each pre-Sunny-Citrus swatch to its closest replacement, by hue rather
 * than by position, so a habit keeps roughly the color its owner chose.
 *
 * Consumed by the 20260910120000_retone_habit_colors migration. Kept here so
 * the mapping lives next to the palette it targets — if a future retone happens,
 * both halves are visible in one place.
 */
export const LEGACY_COLOR_REPLACEMENTS: Record<string, HabitColor> = {
  "#8b5cf6": "#7c5295", // violet -> plum
  "#3b82f6": "#2a8a7a", // blue -> teal
  "#06b6d4": "#2a8a7a", // cyan -> teal
  "#22c55e": "#2e8b57", // green -> fern
  "#f97316": "#c65f1c", // orange -> ember
  "#ef4444": "#b8442f", // red -> clay
  "#ec4899": "#bf5480", // pink -> rose
  "#64748b": "#7a6a55", // slate -> taupe
};
