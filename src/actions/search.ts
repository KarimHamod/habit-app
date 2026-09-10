"use server";

import { searchUserContent } from "@/lib/search/data";
import { normalizeSearchQuery } from "@/lib/search/query";
import type { SearchResults } from "@/lib/search/types";
import { EMPTY_SEARCH_RESULTS } from "@/lib/search/types";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export type SearchActionResult = { results: SearchResults } | { error: string };

/**
 * Global search over the caller's own habits and journal entries.
 *
 * The user id comes from the authenticated session, never from the client, so
 * a caller cannot search another account by passing an id. A query shorter
 * than the minimum returns empty results without touching the database.
 */
export async function searchEverything(
  rawQuery: string,
): Promise<SearchActionResult> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) {
    return { results: EMPTY_SEARCH_RESULTS };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "You need to be signed in to search." };
  }

  try {
    return { results: await searchUserContent(user.id, query) };
  } catch {
    return { error: "Search is unavailable right now. Please try again." };
  }
}
