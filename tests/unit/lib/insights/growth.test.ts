import { describe, expect, it } from "vitest";

import { growthStageFor } from "@/lib/insights/growth";

describe("growthStageFor", () => {
  it("returns stage 0 when nothing was scheduled in the window, regardless of rate", () => {
    expect(growthStageFor(100, 0)).toBe(0);
    expect(growthStageFor(0, 0)).toBe(0);
  });

  it("returns stage 1 for a rate below 40%", () => {
    expect(growthStageFor(0, 10)).toBe(1);
    expect(growthStageFor(39, 10)).toBe(1);
  });

  it("returns stage 2 for a rate from 40% up to (not including) 75%", () => {
    expect(growthStageFor(40, 10)).toBe(2);
    expect(growthStageFor(74, 10)).toBe(2);
  });

  it("returns stage 3 for a rate of 75% or above", () => {
    expect(growthStageFor(75, 10)).toBe(3);
    expect(growthStageFor(100, 10)).toBe(3);
  });
});
