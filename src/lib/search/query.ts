/** Shortest query worth running — one character matches nearly everything. */
export const MIN_QUERY_LENGTH = 2;

/** How much of a reflection to show around the match. */
const EXCERPT_RADIUS = 60;

/**
 * Trims and collapses whitespace, returning null for anything too short to be
 * worth a round trip. Callers treat null as "show the idle prompt", which is
 * also what an empty input produces.
 */
export function normalizeSearchQuery(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  return collapsed.length >= MIN_QUERY_LENGTH ? collapsed : null;
}

/**
 * Escapes the LIKE wildcards so a query containing % or _ matches those
 * characters literally instead of silently broadening the search. This is a
 * correctness fix, not a security boundary — the value is still sent as a
 * bound parameter, and RLS is what actually scopes rows to the user.
 */
export function escapeLikePattern(query: string): string {
  return query.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * A one-line snippet of `body` centred on the first case-insensitive match of
 * `query`, with ellipses where text was cut. Falls back to the head of the
 * body when the match is not found — the DB matched on something, so showing
 * the opening is more useful than showing nothing.
 */
export function buildExcerpt(
  body: string,
  query: string,
  radius = EXCERPT_RADIUS,
): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const index = flat.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return flat.length > radius * 2
      ? `${flat.slice(0, radius * 2).trimEnd()}…`
      : flat;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(flat.length, index + query.length + radius);

  return [
    start > 0 ? "…" : "",
    flat.slice(start, end).trim(),
    end < flat.length ? "…" : "",
  ].join("");
}
