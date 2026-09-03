import { describe, expect, it } from "vitest";

import {
  loginSchema,
  onboardingSchema,
  signupSchema,
} from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "hunter2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts a valid email and an 8+ character password", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "hunter22",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 72 characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts valid onboarding input", () => {
    const result = onboardingSchema.safeParse({
      displayName: "Karim",
      timezone: "America/New_York",
      weekStartsOn: "1",
    });
    expect(result.success).toBe(true);
  });

  it("coerces weekStartsOn from a form-data string to a number", () => {
    const result = onboardingSchema.safeParse({
      displayName: "Karim",
      timezone: "UTC",
      weekStartsOn: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weekStartsOn).toBe(0);
    }
  });

  it("rejects a weekStartsOn out of range", () => {
    const result = onboardingSchema.safeParse({
      displayName: "Karim",
      timezone: "UTC",
      weekStartsOn: "7",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty display name", () => {
    const result = onboardingSchema.safeParse({
      displayName: "   ",
      timezone: "UTC",
      weekStartsOn: "1",
    });
    expect(result.success).toBe(false);
  });
});
