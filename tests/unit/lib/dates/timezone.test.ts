import { describe, expect, it } from "vitest";

import { getDaypartGreeting, toZonedDateString } from "@/lib/dates/timezone";

describe("toZonedDateString", () => {
  it("can land on the previous day west of UTC", () => {
    // 2026-08-31T02:00:00Z is still 2026-08-30 evening in Los Angeles.
    const instant = new Date("2026-08-31T02:00:00Z");
    expect(toZonedDateString(instant, "America/Los_Angeles")).toBe(
      "2026-08-30",
    );
    expect(toZonedDateString(instant, "UTC")).toBe("2026-08-31");
  });

  it("can land on the next day east of UTC", () => {
    // 2026-08-31T22:00:00Z is already 2026-09-01 morning in Tokyo.
    const instant = new Date("2026-08-31T22:00:00Z");
    expect(toZonedDateString(instant, "Asia/Tokyo")).toBe("2026-09-01");
    expect(toZonedDateString(instant, "UTC")).toBe("2026-08-31");
  });

  it("stays consistent across a DST transition", () => {
    // 2026-03-08 is US spring-forward; both sides of it must still resolve cleanly.
    expect(
      toZonedDateString(new Date("2026-03-08T09:00:00Z"), "America/New_York"),
    ).toBe("2026-03-08");
    expect(
      toZonedDateString(new Date("2026-03-09T09:00:00Z"), "America/New_York"),
    ).toBe("2026-03-09");
  });
});

describe("getDaypartGreeting", () => {
  it("returns morning before noon", () => {
    expect(getDaypartGreeting("UTC", new Date("2026-08-31T08:00:00Z"))).toBe(
      "morning",
    );
  });

  it("returns afternoon between noon and 6pm", () => {
    expect(getDaypartGreeting("UTC", new Date("2026-08-31T14:00:00Z"))).toBe(
      "afternoon",
    );
  });

  it("returns evening after 6pm", () => {
    expect(getDaypartGreeting("UTC", new Date("2026-08-31T20:00:00Z"))).toBe(
      "evening",
    );
  });

  it("evaluates the hour in the given timezone, not UTC", () => {
    // 2026-08-31T05:00:00Z is 22:00 the previous evening in Los Angeles (PDT, UTC-7).
    expect(
      getDaypartGreeting(
        "America/Los_Angeles",
        new Date("2026-08-31T05:00:00Z"),
      ),
    ).toBe("evening");
  });
});
