import { createClient } from "@/lib/supabase/server";

import { buildExcerpt, escapeLikePattern } from "./query";
import type { SearchResults } from "./types";
import { EMPTY_SEARCH_RESULTS } from "./types";

/** Per-section cap. Enough to be useful in a palette without a scroll marathon. */
const SECTION_LIMIT = 6;

/**
 * Searches the user's own habits and reflections.
 *
 * Both queries run server-side and are scoped by `user_id` on top of the
 * tables' RLS policies, so results can never cross users. `userId` is only
 * ever the id the caller read from the authenticated session — it is never
 * accepted from the client.
 *
 * Habits match on name only. Widening this to `description` would mean an
 * `.or()` filter string, where a query containing a comma or parenthesis
 * would change the filter's meaning rather than being matched literally.
 *
 * Degrades to empty sections rather than throwing: search is an accessory to
 * every page, and a query hiccup should close quietly, not surface an error
 * over whatever the user was actually doing.
 */
export async function searchUserContent(
  userId: string,
  query: string,
): Promise<SearchResults> {
  const pattern = `%${escapeLikePattern(query)}%`;
  const supabase = await createClient();

  const [{ data: habitRows }, { data: reflectionRows }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, icon, color, is_archived")
      .eq("user_id", userId)
      .ilike("name", pattern)
      // Active habits first; an archived one is still findable, just lower.
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true })
      .limit(SECTION_LIMIT),
    supabase
      .from("reflections")
      .select("id, entry_date, body")
      .eq("user_id", userId)
      .ilike("body", pattern)
      .order("entry_date", { ascending: false })
      .limit(SECTION_LIMIT),
  ]);

  if (!habitRows && !reflectionRows) {
    return EMPTY_SEARCH_RESULTS;
  }

  return {
    habits: (habitRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      isArchived: row.is_archived,
    })),
    reflections: (reflectionRows ?? []).map((row) => ({
      id: row.id,
      entryDate: row.entry_date,
      excerpt: buildExcerpt(row.body, query),
    })),
  };
}
