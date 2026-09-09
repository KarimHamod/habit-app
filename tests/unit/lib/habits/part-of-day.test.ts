import { describe, expect, it } from "vitest";

import {
  groupHabitsByPartOfDay,
  isPartOfDay,
  PART_OF_DAY_LABELS,
  PART_OF_DAY_ORDER,
  type PartOfDay,
} from "@/lib/habits/part-of-day";

function habit(id: string, partOfDay: PartOfDay) {
  return { id, partOfDay };
}

describe("isPartOfDay", () => {
  it("accepts every value in the display order", () => {
    for (const part of PART_OF_DAY_ORDER) {
      expect(isPartOfDay(part)).toBe(true);
    }
  });

  it("rejects null", () => {
    expect(isPartOfDay(null)).toBe(false);
  });

  it("rejects an unknown string", () => {
    expect(isPartOfDay("midnight")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isPartOfDay("")).toBe(false);
  });
});

describe("PART_OF_DAY_LABELS", () => {
  it("has a label for every part of day", () => {
    for (const part of PART_OF_DAY_ORDER) {
      expect(PART_OF_DAY_LABELS[part]).toBeTruthy();
    }
  });
});

describe("groupHabitsByPartOfDay", () => {
  it("returns no groups for an empty list", () => {
    expect(groupHabitsByPartOfDay([])).toEqual([]);
  });

  it("orders groups morning, afternoon, evening, anytime regardless of input order", () => {
    const groups = groupHabitsByPartOfDay([
      habit("a", "anytime"),
      habit("e", "evening"),
      habit("m", "morning"),
      habit("f", "afternoon"),
    ]);

    expect(groups.map((g) => g.part)).toEqual([
      "morning",
      "afternoon",
      "evening",
      "anytime",
    ]);
  });

  it("omits empty groups", () => {
    const groups = groupHabitsByPartOfDay([
      habit("m", "morning"),
      habit("e", "evening"),
    ]);

    expect(groups.map((g) => g.part)).toEqual(["morning", "evening"]);
  });

  it("returns a single group when every habit is anytime", () => {
    const groups = groupHabitsByPartOfDay([
      habit("a", "anytime"),
      habit("b", "anytime"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].part).toBe("anytime");
    expect(groups[0].habits.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("preserves the caller's relative order within a group", () => {
    const groups = groupHabitsByPartOfDay([
      habit("m1", "morning"),
      habit("e1", "evening"),
      habit("m2", "morning"),
      habit("m3", "morning"),
    ]);

    expect(groups[0].habits.map((h) => h.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("keeps every habit — no drops across groups", () => {
    const input = [
      habit("a", "anytime"),
      habit("m", "morning"),
      habit("f", "afternoon"),
      habit("e", "evening"),
    ];
    const total = groupHabitsByPartOfDay(input).reduce(
      (sum, group) => sum + group.habits.length,
      0,
    );

    expect(total).toBe(input.length);
  });
});
