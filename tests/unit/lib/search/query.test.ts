import { describe, expect, it } from "vitest";

import {
  buildExcerpt,
  escapeLikePattern,
  normalizeSearchQuery,
} from "@/lib/search/query";

describe("normalizeSearchQuery", () => {
  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
  });

  it("returns null for a single character", () => {
    expect(normalizeSearchQuery("a")).toBeNull();
    expect(normalizeSearchQuery("  a  ")).toBeNull();
  });

  it("trims and keeps a query at the minimum length", () => {
    expect(normalizeSearchQuery("  run  ")).toBe("run");
    expect(normalizeSearchQuery("ru")).toBe("ru");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeSearchQuery("morning   walk")).toBe("morning walk");
  });
});

describe("escapeLikePattern", () => {
  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("morning walk")).toBe("morning walk");
  });

  it("escapes wildcards so they match literally", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });
});

describe("buildExcerpt", () => {
  it("returns a short body unchanged", () => {
    expect(buildExcerpt("Felt calm today.", "calm")).toBe("Felt calm today.");
  });

  it("flattens newlines into a single line", () => {
    expect(buildExcerpt("Felt calm\n\ntoday.", "calm")).toBe(
      "Felt calm today.",
    );
  });

  it("centres the snippet on the match and marks both cuts", () => {
    const body = `${"x".repeat(200)} needle ${"y".repeat(200)}`;
    const excerpt = buildExcerpt(body, "needle", 10);

    expect(excerpt).toContain("needle");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThan(body.length);
  });

  it("matches case-insensitively", () => {
    expect(buildExcerpt("Felt Calm today.", "calm")).toContain("Calm");
  });

  it("does not mark a cut at the start when the match is near the beginning", () => {
    const excerpt = buildExcerpt(`needle ${"y".repeat(200)}`, "needle", 10);

    expect(excerpt.startsWith("…")).toBe(false);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("falls back to the head of the body when the query is not present", () => {
    const body = "z".repeat(300);
    const excerpt = buildExcerpt(body, "needle", 10);

    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThan(body.length);
  });
});
