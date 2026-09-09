/**
 * The sibling-route pairs each primary nav section contains. Shared so the
 * two pages in a section can't drift out of sync.
 */
export const RITUALS_TABS = [
  { href: "/challenges", label: "Challenges" },
  { href: "/habits", label: "My habits" },
] as const;

export const CONSISTENCY_TABS = [
  { href: "/insights", label: "Insights" },
  { href: "/calendar", label: "Calendar" },
] as const;
