export type InsightTone = "positive" | "warning";

export interface Insight {
  message: string;
  tone: InsightTone;
}

export interface InsightInput {
  overallCompletionRate: number;
  previousOverallCompletionRate: number;
  allHabitsCompletedToday: boolean;
  hasHabitsToday: boolean;
  habitStreaks: { name: string; currentStreak: number }[];
  habitTrends: { name: string; delta: number }[];
}

/**
 * Deterministic, rule-based insights — no AI. Kept pure and separate from
 * rendering so the rules stay simple to reason about and test in isolation.
 * The caller decides how many to actually display.
 */
export function generateInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  if (input.overallCompletionRate - input.previousOverallCompletionRate > 10) {
    insights.push({
      message: "Your consistency improved significantly.",
      tone: "positive",
    });
  }

  for (const habit of input.habitStreaks) {
    if (habit.currentStreak >= 7) {
      insights.push({
        message: `You've maintained ${habit.name} for a full week.`,
        tone: "positive",
      });
    }
  }

  for (const habit of input.habitTrends) {
    if (habit.delta < -15) {
      insights.push({
        message: `${habit.name} has been harder to maintain recently.`,
        tone: "warning",
      });
    }
  }

  if (input.hasHabitsToday && input.allHabitsCompletedToday) {
    insights.push({ message: "Perfect day.", tone: "positive" });
  }

  return insights;
}
