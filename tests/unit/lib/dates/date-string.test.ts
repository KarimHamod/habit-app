import { describe, expect, it } from "vitest";

import {
  addDays,
  compareDateStrings,
  enumerateDates,
  formatFriendlyDate,
  formatMonthYear,
  getDayOfWeek,
  getMonthKey,
  getWeekStart,
  shiftMonth,
} from "@/lib/dates/date-string";

describe("compareDateStrings", () => {
  it("orders dates correctly", () => {
    expect(compareDateStrings("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareDateStrings("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
    expect(compareDateStrings("2026-01-01", "2026-01-01")).toBe(0);
  });
});

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-01-01", 5)).toBe("2026-01-06");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("handles negative offsets", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is unaffected by DST transitions", () => {
    // US DST spring-forward 2026-03-08; this must stay pure calendar math.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("getDayOfWeek", () => {
  it("returns 0 for Sunday and 1 for Monday", () => {
    expect(getDayOfWeek("2026-08-30")).toBe(0); // Sunday
    expect(getDayOfWeek("2026-08-31")).toBe(1); // Monday
    expect(getDayOfWeek("2026-09-05")).toBe(6); // Saturday
  });
});

describe("enumerateDates", () => {
  it("includes both endpoints", () => {
    expect(enumerateDates("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("returns a single date when start equals end", () => {
    expect(enumerateDates("2026-08-01", "2026-08-01")).toEqual(["2026-08-01"]);
  });

  it("returns an empty array when start is after end", () => {
    expect(enumerateDates("2026-08-05", "2026-08-01")).toEqual([]);
  });
});

describe("getWeekStart", () => {
  it("finds the Monday of the week when weekStartsOn is 1", () => {
    expect(getWeekStart("2026-08-31", 1)).toBe("2026-08-31"); // already Monday
    expect(getWeekStart("2026-09-05", 1)).toBe("2026-08-31"); // Saturday -> that Monday
  });

  it("finds the Sunday of the week when weekStartsOn is 0", () => {
    expect(getWeekStart("2026-08-31", 0)).toBe("2026-08-30");
  });
});

describe("formatFriendlyDate", () => {
  it("renders a weekday, month, and day", () => {
    expect(formatFriendlyDate("2026-08-31")).toBe("Monday, August 31");
  });

  it("does not shift the date regardless of the runner's local timezone", () => {
    expect(formatFriendlyDate("2026-01-01")).toBe("Thursday, January 1");
  });
});

describe("getMonthKey", () => {
  it("extracts the YYYY-MM prefix", () => {
    expect(getMonthKey("2026-08-31")).toBe("2026-08");
  });
});

describe("shiftMonth", () => {
  it("moves forward within a year", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
  });

  it("moves backward within a year", () => {
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
  });

  it("rolls over to the next year", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("rolls back to the previous year", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("handles multi-month jumps", () => {
    expect(shiftMonth("2026-01", 13)).toBe("2027-02");
  });
});

describe("formatMonthYear", () => {
  it("renders a month and year", () => {
    expect(formatMonthYear("2026-08")).toBe("August 2026");
  });
});
