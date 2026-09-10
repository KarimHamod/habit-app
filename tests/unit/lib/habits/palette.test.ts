import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getAccentForegroundColor } from "@/lib/habits/color";
import {
  HABIT_COLOR_SWATCHES,
  LEGACY_COLOR_REPLACEMENTS,
} from "@/lib/habits/palette";

const MIGRATION = "supabase/migrations/20260910120000_retone_habit_colors.sql";

describe("HABIT_COLOR_SWATCHES", () => {
  it("are all valid six-digit lowercase hex", () => {
    for (const hex of HABIT_COLOR_SWATCHES) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("has no duplicates, so every habit color is distinguishable", () => {
    expect(new Set(HABIT_COLOR_SWATCHES).size).toBe(
      HABIT_COLOR_SWATCHES.length,
    );
  });

  it("keeps its lettering legible on every swatch", () => {
    for (const hex of HABIT_COLOR_SWATCHES) {
      expect(["#ffffff", "#111114"]).toContain(getAccentForegroundColor(hex));
    }
  });
});

describe("LEGACY_COLOR_REPLACEMENTS", () => {
  it("only ever maps onto a current swatch", () => {
    for (const replacement of Object.values(LEGACY_COLOR_REPLACEMENTS)) {
      expect(HABIT_COLOR_SWATCHES).toContain(replacement);
    }
  });

  it("never maps a color to itself", () => {
    for (const [legacy, replacement] of Object.entries(
      LEGACY_COLOR_REPLACEMENTS,
    )) {
      expect(legacy).not.toBe(replacement);
    }
  });

  it("covers every legacy swatch the migration rewrites", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const rewritten = [...sql.matchAll(/when '(#[0-9a-f]{6})' then/g)].map(
      (match) => match[1],
    );

    expect(new Set(rewritten)).toEqual(
      new Set(Object.keys(LEGACY_COLOR_REPLACEMENTS)),
    );
  });

  it("agrees with the migration on every replacement", () => {
    const sql = readFileSync(MIGRATION, "utf8");

    for (const [legacy, replacement] of Object.entries(
      LEGACY_COLOR_REPLACEMENTS,
    )) {
      expect(sql).toContain(`when '${legacy}' then '${replacement}'`);
    }
  });
});
