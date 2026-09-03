import { describe, expect, it } from "vitest";

import { generateInsights, type InsightInput } from "@/lib/insights/engine";

function baseInput(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    overallCompletionRate: 50,
    previousOverallCompletionRate: 50,
    allHabitsCompletedToday: false,
    hasHabitsToday: true,
    habitStreaks: [],
    habitTrends: [],
    ...overrides,
  };
}

describe("generateInsights", () => {
  it("flags a significant consistency improvement", () => {
    const insights = generateInsights(
      baseInput({
        overallCompletionRate: 65,
        previousOverallCompletionRate: 50,
      }),
    );
    expect(insights).toContainEqual({
      message: "Your consistency improved significantly.",
      tone: "positive",
    });
  });

  it("does not flag improvement of 10% or less", () => {
    const insights = generateInsights(
      baseInput({
        overallCompletionRate: 60,
        previousOverallCompletionRate: 50,
      }),
    );
    expect(insights).not.toContainEqual(
      expect.objectContaining({
        message: "Your consistency improved significantly.",
      }),
    );
  });

  it("celebrates a habit streak of a full week or more", () => {
    const insights = generateInsights(
      baseInput({ habitStreaks: [{ name: "Meditate", currentStreak: 7 }] }),
    );
    expect(insights).toContainEqual({
      message: "You've maintained Meditate for a full week.",
      tone: "positive",
    });
  });

  it("does not celebrate a streak under 7", () => {
    const insights = generateInsights(
      baseInput({ habitStreaks: [{ name: "Meditate", currentStreak: 6 }] }),
    );
    expect(insights).toHaveLength(0);
  });

  it("warns about a habit that declined more than 15%", () => {
    const insights = generateInsights(
      baseInput({ habitTrends: [{ name: "Reading", delta: -20 }] }),
    );
    expect(insights).toContainEqual({
      message: "Reading has been harder to maintain recently.",
      tone: "warning",
    });
  });

  it("does not warn about a decline of 15% or less", () => {
    const insights = generateInsights(
      baseInput({ habitTrends: [{ name: "Reading", delta: -15 }] }),
    );
    expect(insights).toHaveLength(0);
  });

  it("celebrates a perfect day when habits existed and all were completed", () => {
    const insights = generateInsights(
      baseInput({ hasHabitsToday: true, allHabitsCompletedToday: true }),
    );
    expect(insights).toContainEqual({
      message: "Perfect day.",
      tone: "positive",
    });
  });

  it("does not call a day perfect when there were no habits to do", () => {
    const insights = generateInsights(
      baseInput({ hasHabitsToday: false, allHabitsCompletedToday: true }),
    );
    expect(insights).not.toContainEqual(
      expect.objectContaining({ message: "Perfect day." }),
    );
  });

  it("can surface multiple insights at once", () => {
    const insights = generateInsights(
      baseInput({
        overallCompletionRate: 70,
        previousOverallCompletionRate: 55,
        hasHabitsToday: true,
        allHabitsCompletedToday: true,
        habitStreaks: [{ name: "Meditate", currentStreak: 10 }],
      }),
    );
    expect(insights).toHaveLength(3);
  });
});
