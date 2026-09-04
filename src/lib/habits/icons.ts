/** Curated, finite emoji set for habit icons — plain unicode strings stored directly on habits.icon. */
export const HABIT_ICON_OPTIONS: string[] = [
  "📚",
  "🎓",
  "💻",
  "✍️",
  "💼",
  "📈",
  "🏋️",
  "🏃",
  "🚴",
  "🚶",
  "🧘",
  "🧠",
  "💧",
  "🥗",
  "😴",
  "❤️",
  "🙏",
  "🎨",
  "🎵",
  "📖",
  "🧹",
  "💰",
  "👥",
  "🌱",
];

const CATEGORY_ICON_KEYWORDS: { keywords: string[]; icon: string }[] = [
  { keywords: ["study", "studying", "school", "class"], icon: "📚" },
  { keywords: ["learn", "course"], icon: "🎓" },
  { keywords: ["code", "coding", "programming", "dev"], icon: "💻" },
  { keywords: ["write", "writing", "journal"], icon: "✍️" },
  { keywords: ["work", "job", "office"], icon: "💼" },
  { keywords: ["finance", "money", "budget", "saving"], icon: "💰" },
  { keywords: ["gym", "workout", "strength", "lift"], icon: "🏋️" },
  { keywords: ["run", "running", "jog"], icon: "🏃" },
  { keywords: ["cycle", "cycling", "bike"], icon: "🚴" },
  { keywords: ["walk", "walking"], icon: "🚶" },
  { keywords: ["meditat", "mindful", "yoga"], icon: "🧘" },
  { keywords: ["water", "hydrat"], icon: "💧" },
  { keywords: ["food", "nutrition", "diet", "eat"], icon: "🥗" },
  { keywords: ["sleep", "rest"], icon: "😴" },
  { keywords: ["health", "wellness"], icon: "❤️" },
  { keywords: ["pray", "spiritual", "faith"], icon: "🙏" },
  { keywords: ["art", "creative", "draw", "paint"], icon: "🎨" },
  { keywords: ["music", "practice instrument", "piano", "guitar"], icon: "🎵" },
  { keywords: ["read", "reading", "book"], icon: "📖" },
  { keywords: ["clean", "chore", "tidy"], icon: "🧹" },
  { keywords: ["social", "friend", "family"], icon: "👥" },
];

/**
 * Suggests a default icon by matching keywords against a freeform category
 * name — categories have no fixed taxonomy, so this is a best-effort
 * suggestion, never a guarantee. `null` when nothing matches.
 */
export function getDefaultIconForCategory(
  categoryName: string | null | undefined,
): string | null {
  if (!categoryName) return null;
  const normalized = categoryName.trim().toLowerCase();
  if (!normalized) return null;

  for (const { keywords, icon } of CATEGORY_ICON_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return icon;
    }
  }
  return null;
}
