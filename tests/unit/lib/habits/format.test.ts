import { describe, expect, it } from "vitest";

import { describeFrequency } from "@/lib/habits/format";

describe("describeFrequency", () => {
  it("describes daily habits", () => {
    expect(describeFrequency("daily")).toBe("Every day");
  });

  it("describes weekly habits by their target count", () => {
    expect(describeFrequency("weekly", null, 3)).toBe("3x per week");
  });

  it("recognizes the Mon-Fri weekdays preset", () => {
    expect(describeFrequency("specific_days", [1, 2, 3, 4, 5])).toBe(
      "Weekdays",
    );
  });

  it("lists out arbitrary specific days in order", () => {
    expect(describeFrequency("specific_days", [5, 1, 3])).toBe("Mon, Wed, Fri");
  });

  it("handles no days selected", () => {
    expect(describeFrequency("specific_days", [])).toBe("No days selected");
    expect(describeFrequency("specific_days", null)).toBe("No days selected");
  });

  it("treats custom the same as specific_days", () => {
    expect(describeFrequency("custom", [0, 6])).toBe("Sun, Sat");
  });
});
