import { describe, expect, it } from "vitest";

import {
  COMPANION_NAME,
  companionAddressName,
  companionMoodFor,
  companionPersona,
} from "@/lib/insights/companion-persona";

describe("companionAddressName", () => {
  it("returns null for a missing or blank name", () => {
    expect(companionAddressName(null)).toBeNull();
    expect(companionAddressName("   ")).toBeNull();
  });

  it("uses only the first word of a full name", () => {
    expect(companionAddressName("Maya Okonkwo")).toBe("Maya");
  });

  it("trims surrounding whitespace", () => {
    expect(companionAddressName("  Maya  ")).toBe("Maya");
  });
});

describe("companionMoodFor", () => {
  it("rests when nothing is scheduled, whatever the completed count", () => {
    expect(companionMoodFor(0, 0)).toBe("resting");
    expect(companionMoodFor(3, 0)).toBe("resting");
  });

  it("is ready before the first completion of the day", () => {
    expect(companionMoodFor(0, 4)).toBe("ready");
  });

  it("is cheerful part-way through the day", () => {
    expect(companionMoodFor(1, 4)).toBe("cheerful");
    expect(companionMoodFor(3, 4)).toBe("cheerful");
  });

  it("glows once everything scheduled is done", () => {
    expect(companionMoodFor(4, 4)).toBe("glowing");
  });
});

describe("companionPersona", () => {
  it("always reports the one canonical companion name", () => {
    const persona = companionPersona({
      completedToday: 0,
      totalToday: 0,
      displayName: null,
    });

    expect(persona.name).toBe(COMPANION_NAME);
  });

  it("addresses the user by first name when there is one", () => {
    const persona = companionPersona({
      completedToday: 2,
      totalToday: 4,
      displayName: "Maya Okonkwo",
    });

    expect(persona.message).toContain("Maya");
  });

  it("reads naturally without a display name", () => {
    const persona = companionPersona({
      completedToday: 2,
      totalToday: 4,
      displayName: null,
    });

    expect(persona.message).not.toContain(",");
    expect(persona.message).not.toContain("undefined");
  });

  it("carries a text mood label so mood is never colour-only", () => {
    expect(
      companionPersona({
        completedToday: 4,
        totalToday: 4,
        displayName: null,
      }).moodLabel,
    ).toBe("Glowing");
  });

  it("counts down the habits that remain", () => {
    const persona = companionPersona({
      completedToday: 1,
      totalToday: 4,
      displayName: null,
    });

    expect(persona.message).toContain("3");
  });

  it("uses the singular phrasing for the last remaining habit", () => {
    const persona = companionPersona({
      completedToday: 3,
      totalToday: 4,
      displayName: null,
    });

    expect(persona.message).toContain("One to go");
  });

  it("clamps a completed count above the total instead of going negative", () => {
    const persona = companionPersona({
      completedToday: 9,
      totalToday: 4,
      displayName: null,
    });

    expect(persona.mood).toBe("glowing");
    expect(persona.message).not.toContain("-");
  });

  it("treats a negative total as nothing scheduled", () => {
    expect(
      companionPersona({
        completedToday: 0,
        totalToday: -1,
        displayName: null,
      }).mood,
    ).toBe("resting");
  });

  it("never scolds the user when the day has not started", () => {
    const persona = companionPersona({
      completedToday: 0,
      totalToday: 5,
      displayName: "Maya",
    });

    expect(persona.mood).toBe("ready");
    expect(persona.message).toMatch(/no rush/i);
  });
});
