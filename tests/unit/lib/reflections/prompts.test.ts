import { describe, expect, it } from "vitest";

import { getReflectionPrompt } from "@/lib/reflections/prompts";

describe("getReflectionPrompt", () => {
  it("returns a non-empty prompt", () => {
    expect(getReflectionPrompt("2026-09-09").length).toBeGreaterThan(0);
  });

  it("is stable for the same date", () => {
    expect(getReflectionPrompt("2026-09-09")).toBe(
      getReflectionPrompt("2026-09-09"),
    );
  });

  it("varies across a run of dates", () => {
    const prompts = new Set(
      [
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-05",
        "2026-09-06",
        "2026-09-07",
      ].map(getReflectionPrompt),
    );

    expect(prompts.size).toBeGreaterThan(1);
  });

  it("returns a prompt for a leap day and a year boundary", () => {
    expect(getReflectionPrompt("2028-02-29")).toBeTruthy();
    expect(getReflectionPrompt("2026-12-31")).toBeTruthy();
    expect(getReflectionPrompt("2027-01-01")).toBeTruthy();
  });
});
