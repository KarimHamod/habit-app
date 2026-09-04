import { describe, expect, it } from "vitest";

import { habitSchema } from "@/lib/habits/validation";

const baseInput = {
  name: "Meditate",
  type: "boolean" as const,
  frequencyType: "daily" as const,
  startDate: "2026-08-01",
  reminderEnabled: false,
};

describe("habitSchema", () => {
  it("accepts a minimal valid boolean habit", () => {
    expect(habitSchema.safeParse(baseInput).success).toBe(true);
  });

  it("requires a target for quantity habits", () => {
    const result = habitSchema.safeParse({ ...baseInput, type: "quantity" });
    expect(result.success).toBe(false);
  });

  it("accepts a quantity habit once a target is provided", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      type: "quantity",
      target: 8,
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one day for specific_days frequency", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      frequencyType: "specific_days",
      daysOfWeek: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts specific_days once days are chosen", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      frequencyType: "specific_days",
      daysOfWeek: [1, 3, 5],
    });
    expect(result.success).toBe(true);
  });

  it("requires timesPerPeriod for weekly frequency", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      frequencyType: "weekly",
    });
    expect(result.success).toBe(false);
  });

  it("accepts weekly frequency once timesPerPeriod is set", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      frequencyType: "weekly",
      timesPerPeriod: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      startDate: "2026-08-10",
      endDate: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(habitSchema.safeParse({ ...baseInput, name: "  " }).success).toBe(
      false,
    );
  });

  it("treats an empty-string endDate as absent, not an invalid date", () => {
    // Native <input type="date"> reports an untouched field as "" — a form
    // submitted without an end date must not fail with a format error.
    const result = habitSchema.safeParse({ ...baseInput, endDate: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endDate).toBeUndefined();
    }
  });

  it("treats an empty-string reminderTime as absent, not an invalid time", () => {
    const result = habitSchema.safeParse({ ...baseInput, reminderTime: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reminderTime).toBeUndefined();
    }
  });

  it("still rejects a genuinely malformed endDate", () => {
    const result = habitSchema.safeParse({
      ...baseInput,
      endDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an icon and leaves it optional", () => {
    expect(habitSchema.safeParse(baseInput).success).toBe(true);
    const result = habitSchema.safeParse({ ...baseInput, icon: "📚" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBe("📚");
    }
  });
});
