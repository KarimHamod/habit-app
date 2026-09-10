/**
 * The companion's fixed identity. One name, used everywhere it is referred to,
 * so the widget, its accessible labels and its voice never disagree.
 */
export const COMPANION_NAME = "Leo";

/**
 * How the companion reads *today*, which is deliberately separate from
 * `GrowthStage` in ./growth: stage reflects a trailing 30-day window and moves
 * slowly, mood reflects the day in front of the user and resets every night.
 *
 * Every mood is neutral-to-warm on purpose. There is no "disappointed" or
 * "neglected" state, because a companion that visibly sulks would pressure the
 * user into opening the app — the thing CLAUDE.md's gamification test rules out.
 */
export type CompanionMood = "resting" | "ready" | "cheerful" | "glowing";

export interface CompanionPersona {
  name: string;
  mood: CompanionMood;
  /** Short human label for the mood, shown as text so mood is never colour-only. */
  moodLabel: string;
  /** First-person line from the companion, shown in its speech bubble. */
  message: string;
}

const MOOD_LABELS: Record<CompanionMood, string> = {
  resting: "Resting",
  ready: "Ready",
  cheerful: "Cheerful",
  glowing: "Glowing",
};

/**
 * Trims a display name down to the part a companion would actually say. Falls
 * back to null for empty/whitespace names so callers render an unnamed line
 * instead of an awkward dangling comma.
 */
export function companionAddressName(
  displayName: string | null,
): string | null {
  const trimmed = displayName?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function messageFor(
  mood: CompanionMood,
  name: string | null,
  remaining: number,
): string {
  const you = name ? `, ${name}` : "";

  switch (mood) {
    case "resting":
      return `Nothing scheduled today${you}. I'll keep the sun warm for you.`;
    case "ready":
      return `Whenever you're ready${you} — no rush from me.`;
    case "cheerful":
      return remaining === 1
        ? `One to go${you}. Nice and steady.`
        : `Good going${you}. ${remaining} left whenever you want them.`;
    case "glowing":
      return `That's everything${you}. Go enjoy the rest of your day.`;
  }
}

export function companionMoodFor(
  completedToday: number,
  totalToday: number,
): CompanionMood {
  if (totalToday <= 0) return "resting";
  if (completedToday <= 0) return "ready";
  if (completedToday >= totalToday) return "glowing";
  return "cheerful";
}

/**
 * Builds the companion's name, mood and spoken line for the Today side rail.
 *
 * Pure and derived from the day's counts, so it follows optimistic completion
 * toggles for free and never needs its own stored state.
 */
export function companionPersona({
  completedToday,
  totalToday,
  displayName,
}: {
  completedToday: number;
  totalToday: number;
  displayName: string | null;
}): CompanionPersona {
  const total = Math.max(0, totalToday);
  const completed = Math.min(Math.max(0, completedToday), total);
  const mood = companionMoodFor(completed, total);
  const name = companionAddressName(displayName);

  return {
    name: COMPANION_NAME,
    mood,
    moodLabel: MOOD_LABELS[mood],
    message: messageFor(mood, name, total - completed),
  };
}
