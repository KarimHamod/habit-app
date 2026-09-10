import { describe, expect, it } from "vitest";

import { pickNextHabit } from "@/lib/habits/next-up";
import type { PartOfDay } from "@/lib/habits/part-of-day";

function habit(id: string, partOfDay: PartOfDay, completed = false) {
  return { id, partOfDay, completed };
}

describe("pickNextHabit", () => {
  it("returns null for an empty list", () => {
    expect(pickNextHabit([])).toBeNull();
  });

  it("returns null when every habit is already complete", () => {
    expect(
      pickNextHabit([habit("a", "morning", true), habit("b", "evening", true)]),
    ).toBeNull();
  });

  it("returns the first incomplete habit within a bucket", () => {
    const next = pickNextHabit([
      habit("a", "morning", true),
      habit("b", "morning"),
      habit("c", "morning"),
    ]);

    expect(next?.id).toBe("b");
  });

  it("follows part-of-day order rather than list order", () => {
    const next = pickNextHabit([
      habit("evening", "evening"),
      habit("anytime", "anytime"),
      habit("afternoon", "afternoon"),
      habit("morning", "morning"),
    ]);

    expect(next?.id).toBe("morning");
  });

  it("sorts anytime last, so a placed habit always wins", () => {
    const next = pickNextHabit([
      habit("anytime", "anytime"),
      habit("evening", "evening"),
    ]);

    expect(next?.id).toBe("evening");
  });

  it("falls through to a later bucket once earlier ones are done", () => {
    const next = pickNextHabit([
      habit("m1", "morning", true),
      habit("m2", "morning", true),
      habit("a1", "afternoon"),
      habit("e1", "evening"),
    ]);

    expect(next?.id).toBe("a1");
  });

  it("picks the only anytime habit when nothing is placed", () => {
    const next = pickNextHabit([
      habit("x", "anytime", true),
      habit("y", "anytime"),
    ]);

    expect(next?.id).toBe("y");
  });
});
