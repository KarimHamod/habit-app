import { describe, expect, it } from "vitest";

import {
  challengeDayNumber,
  challengeEndDate,
  isChallengeActive,
} from "@/lib/challenges/status";

describe("challengeEndDate", () => {
  it("returns the last day of the challenge, inclusive of the start date", () => {
    // A 1-day challenge starting and ending on the same date.
    expect(challengeEndDate("2026-09-01", 1)).toBe("2026-09-01");
  });

  it("returns start date + (duration - 1) days for a multi-day challenge", () => {
    expect(challengeEndDate("2026-09-01", 30)).toBe("2026-09-30");
  });
});

describe("challengeDayNumber", () => {
  it("returns 1 on the start date", () => {
    expect(challengeDayNumber("2026-09-01", "2026-09-01")).toBe(1);
  });

  it("returns the correct 1-indexed day partway through", () => {
    expect(challengeDayNumber("2026-09-01", "2026-09-12")).toBe(12);
  });
});

describe("isChallengeActive", () => {
  it("is active on the start date", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-09-01")).toBe(true);
  });

  it("is active on the last day", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-09-30")).toBe(true);
  });

  it("is not active the day after it ends", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-10-01")).toBe(false);
  });

  it("is active for a single-day challenge only on that day", () => {
    expect(isChallengeActive("2026-09-01", 1, "2026-09-01")).toBe(true);
    expect(isChallengeActive("2026-09-01", 1, "2026-09-02")).toBe(false);
  });
});
