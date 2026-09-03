import { describe, expect, it } from "vitest";

import { isAuthRoute, isPublicRoute } from "@/lib/auth/routes";

describe("isAuthRoute", () => {
  it("treats /login and /signup as auth routes", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup")).toBe(true);
  });

  it("does not treat protected routes as auth routes", () => {
    expect(isAuthRoute("/today")).toBe(false);
    expect(isAuthRoute("/onboarding")).toBe(false);
  });
});

describe("isPublicRoute", () => {
  it("treats the root and auth routes as public", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/signup")).toBe(true);
  });

  it("treats app routes as protected, not public", () => {
    expect(isPublicRoute("/today")).toBe(false);
    expect(isPublicRoute("/habits")).toBe(false);
    expect(isPublicRoute("/onboarding")).toBe(false);
  });
});
