import { describe, expect, it } from "vitest";

import {
  buildCompletionPayload,
  buildQuickAddPresets,
  calculateHabitProgress,
  parseAmountInput,
} from "@/lib/habits/completion";

describe("calculateHabitProgress", () => {
  it("computes a partial percentage", () => {
    expect(calculateHabitProgress(5, 10)).toBe(50);
  });

  it("reaches exactly 100% at target", () => {
    expect(calculateHabitProgress(10, 10)).toBe(100);
  });

  it("caps at 100% when the value exceeds target", () => {
    expect(calculateHabitProgress(12, 10)).toBe(100);
  });

  it("never goes below 0%", () => {
    expect(calculateHabitProgress(-5, 10)).toBe(0);
  });

  it("returns 0 for a non-positive target instead of dividing by zero", () => {
    expect(calculateHabitProgress(5, 0)).toBe(0);
  });
});

describe("buildCompletionPayload", () => {
  it("always writes value 1 for a boolean habit (create)", () => {
    expect(buildCompletionPayload({ type: "boolean" })).toEqual({
      completed: true,
      value: 1,
    });
  });

  it("marks a quantity habit incomplete while the value is below target", () => {
    expect(
      buildCompletionPayload({ type: "quantity", value: 6, target: 8 }),
    ).toEqual({
      completed: false,
      value: 6,
    });
  });

  it("marks a quantity habit complete once the value reaches target", () => {
    expect(
      buildCompletionPayload({ type: "quantity", value: 8, target: 8 }),
    ).toEqual({
      completed: true,
      value: 8,
    });
  });

  it("treats an untargeted quantity habit as complete on any logged value", () => {
    expect(buildCompletionPayload({ type: "quantity", value: 6 })).toEqual({
      completed: true,
      value: 6,
    });
  });

  it("re-evaluates completed on repeat calls (update / duplicate submit)", () => {
    const first = buildCompletionPayload({
      type: "quantity",
      value: 6,
      target: 8,
    });
    const second = buildCompletionPayload({
      type: "quantity",
      value: 8,
      target: 8,
    });
    expect(first).toEqual({ completed: false, value: 6 });
    expect(second).toEqual({ completed: true, value: 8 });
  });

  it("rejects a missing value for quantity/duration habits", () => {
    expect(buildCompletionPayload({ type: "quantity" })).toEqual({
      error: "A value is required for this habit",
    });
    expect(buildCompletionPayload({ type: "duration" })).toEqual({
      error: "A value is required for this habit",
    });
  });

  it("rejects a negative value", () => {
    expect(buildCompletionPayload({ type: "quantity", value: -1 })).toEqual({
      error: "Value must be zero or greater",
    });
  });

  it("accepts zero as a valid value", () => {
    expect(buildCompletionPayload({ type: "quantity", value: 0 })).toEqual({
      completed: true,
      value: 0,
    });
  });
});

describe("parseAmountInput", () => {
  it("parses a valid integer", () => {
    expect(parseAmountInput("45")).toBe(45);
  });

  it("parses a valid decimal", () => {
    expect(parseAmountInput("2.5")).toBe(2.5);
  });

  it("accepts zero", () => {
    expect(parseAmountInput("0")).toBe(0);
  });

  it("rejects an empty string", () => {
    expect(parseAmountInput("")).toBeNull();
  });

  it("rejects a blank string", () => {
    expect(parseAmountInput("   ")).toBeNull();
  });

  it("rejects a negative number", () => {
    expect(parseAmountInput("-5")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseAmountInput("abc")).toBeNull();
  });
});

describe("buildQuickAddPresets", () => {
  it("returns quarter/half/full of a typical target", () => {
    expect(buildQuickAddPresets(60)).toEqual([15, 30, 60]);
  });

  it("keeps fractional presets for a small target", () => {
    expect(buildQuickAddPresets(1)).toEqual([0.25, 0.5, 1]);
  });

  it("dedupes presets that round to the same value", () => {
    expect(buildQuickAddPresets(0.01)).toEqual([0, 0.01]);
  });

  it("returns an empty list for a null target", () => {
    expect(buildQuickAddPresets(null)).toEqual([]);
  });

  it("returns an empty list for an undefined target", () => {
    expect(buildQuickAddPresets(undefined)).toEqual([]);
  });

  it("returns an empty list for a non-positive target", () => {
    expect(buildQuickAddPresets(0)).toEqual([]);
    expect(buildQuickAddPresets(-10)).toEqual([]);
  });
});
