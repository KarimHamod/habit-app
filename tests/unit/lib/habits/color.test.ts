import { describe, expect, it } from "vitest";

import { getAccentForegroundColor } from "@/lib/habits/color";

describe("getAccentForegroundColor", () => {
  it("returns white for a dark, saturated accent", () => {
    expect(getAccentForegroundColor("#4f46e5")).toBe("#ffffff");
  });

  it("returns near-black for a light, low-contrast accent", () => {
    expect(getAccentForegroundColor("#06b6d4")).toBe("#111114");
  });

  it("returns near-black for the palette's brightest greens", () => {
    expect(getAccentForegroundColor("#22c55e")).toBe("#111114");
  });

  it("defaults to white when no color is set", () => {
    expect(getAccentForegroundColor(null)).toBe("#ffffff");
    expect(getAccentForegroundColor(undefined)).toBe("#ffffff");
  });

  it("defaults to near-black for unparseable input", () => {
    expect(getAccentForegroundColor("not-a-color")).toBe("#111114");
  });
});
