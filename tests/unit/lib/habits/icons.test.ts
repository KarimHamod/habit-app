import { describe, expect, it } from "vitest";

import { getDefaultIconForCategory } from "@/lib/habits/icons";

describe("getDefaultIconForCategory", () => {
  it("matches a category name against a curated keyword", () => {
    expect(getDefaultIconForCategory("Studying")).toBe("📚");
  });

  it("matches case-insensitively", () => {
    expect(getDefaultIconForCategory("STUDYING")).toBe("📚");
  });

  it("matches a keyword as a substring of a longer category name", () => {
    expect(getDefaultIconForCategory("Deep Work")).toBe("💼");
  });

  it("returns null when no keyword matches", () => {
    expect(getDefaultIconForCategory("Miscellaneous")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getDefaultIconForCategory("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(getDefaultIconForCategory("   ")).toBeNull();
  });

  it("returns null for null", () => {
    expect(getDefaultIconForCategory(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getDefaultIconForCategory(undefined)).toBeNull();
  });
});
