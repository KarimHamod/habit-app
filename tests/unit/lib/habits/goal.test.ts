import { describe, expect, it } from "vitest";

import { calculateGoalProgress } from "@/lib/habits/goal";
import type { HabitCompletionRecord } from "@/lib/habits/types";

describe("calculateGoalProgress", () => {
  it("counts occurrences for a completions-count goal", () => {
    const goal = { target: 25, startDate: "2026-08-01", endDate: "2026-08-31" };
    const completions: HabitCompletionRecord[] = Array.from(
      { length: 10 },
      (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        completed: true,
        value: 1,
      }),
    );
    const result = calculateGoalProgress(goal, completions);
    expect(result.current).toBe(10);
    expect(result.progress).toBe(40);
  });

  it("sums values for a distance/duration goal", () => {
    const goal = { target: 50, startDate: "2026-08-01", endDate: "2026-08-31" };
    const completions: HabitCompletionRecord[] = [
      { date: "2026-08-03", completed: true, value: 20 },
      { date: "2026-08-10", completed: true, value: 15 },
    ];
    const result = calculateGoalProgress(goal, completions);
    expect(result.current).toBe(35);
    expect(result.progress).toBe(70);
  });

  it("excludes completions outside the goal window", () => {
    const goal = { target: 10, startDate: "2026-08-01", endDate: "2026-08-15" };
    const completions: HabitCompletionRecord[] = [
      { date: "2026-07-31", completed: true, value: 5 },
      { date: "2026-08-01", completed: true, value: 5 },
      { date: "2026-08-16", completed: true, value: 5 },
    ];
    expect(calculateGoalProgress(goal, completions).current).toBe(5);
  });

  it("ignores uncompleted rows", () => {
    const goal = { target: 10, startDate: "2026-08-01", endDate: "2026-08-15" };
    const completions: HabitCompletionRecord[] = [
      { date: "2026-08-05", completed: false, value: 5 },
    ];
    expect(calculateGoalProgress(goal, completions).current).toBe(0);
  });

  it("caps progress at 100%", () => {
    const goal = { target: 10, startDate: "2026-08-01", endDate: "2026-08-15" };
    const completions: HabitCompletionRecord[] = [
      { date: "2026-08-05", completed: true, value: 25 },
    ];
    expect(calculateGoalProgress(goal, completions).progress).toBe(100);
  });
});
