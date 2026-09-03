import { describe, expect, it } from "vitest";

import {
  getNextStep,
  getPreviousStep,
  getStepOrder,
} from "@/lib/habits/form-steps";

describe("getStepOrder", () => {
  it("includes the target step for quantity and duration habits", () => {
    expect(getStepOrder("quantity")).toContain("target");
    expect(getStepOrder("duration")).toContain("target");
  });

  it("skips the target step for boolean habits", () => {
    expect(getStepOrder("boolean")).not.toContain("target");
  });
});

describe("getNextStep", () => {
  it("advances through the full sequence for a quantity habit", () => {
    expect(getNextStep("type", "quantity")).toBe("target");
    expect(getNextStep("target", "quantity")).toBe("schedule");
  });

  it("skips target for a boolean habit", () => {
    expect(getNextStep("type", "boolean")).toBe("schedule");
  });

  it("returns null after the last step", () => {
    expect(getNextStep("review", "boolean")).toBeNull();
  });
});

describe("getPreviousStep", () => {
  it("steps back over target for a boolean habit", () => {
    expect(getPreviousStep("schedule", "boolean")).toBe("type");
  });

  it("steps back onto target for a quantity habit", () => {
    expect(getPreviousStep("schedule", "quantity")).toBe("target");
  });

  it("returns null before the first step", () => {
    expect(getPreviousStep("basics", "boolean")).toBeNull();
  });
});
