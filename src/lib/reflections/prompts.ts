/**
 * Gentle, optional prompts shown as the reflection placeholder. They are
 * invitations, never assignments — nothing in the app tracks whether a
 * prompt was answered, and skipping a day costs the user nothing.
 */
const REFLECTION_PROMPTS = [
  "What went well today?",
  "What felt harder than you expected?",
  "What are you grateful for right now?",
  "What would make tomorrow a little easier?",
  "What did you notice about yourself today?",
  "What is worth remembering about today?",
  "Where did you surprise yourself?",
] as const;

/**
 * Picks a prompt deterministically from the date string, so it stays stable
 * for the whole day and doesn't jitter across re-renders or a page refresh.
 * Operates on the 'YYYY-MM-DD' string directly — no Date parsing, so it
 * can't drift across timezones or DST boundaries.
 */
export function getReflectionPrompt(date: string): string {
  let hash = 0;
  for (let i = 0; i < date.length; i += 1) {
    hash = (hash * 31 + date.charCodeAt(i)) % 100000;
  }
  return REFLECTION_PROMPTS[hash % REFLECTION_PROMPTS.length];
}
