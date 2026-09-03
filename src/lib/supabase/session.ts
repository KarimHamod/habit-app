import { cache } from "react";

import { createClient } from "./server";

/**
 * Deduped per request via React's `cache()` — the (app) layout and the page
 * it renders both need the current user/profile, and without this each
 * would issue its own round trip to Supabase.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return profile;
});
