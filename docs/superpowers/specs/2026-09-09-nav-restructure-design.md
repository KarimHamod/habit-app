# Navigation Restructure — Design

## Context

Notion task "Restructure primary navigation" (Medium): update the left nav to
Today's Rituals, Challenges & Rituals, Consistency & Garden, Reflection
Journal, Settings — per the Sprout & Bloom mockup IA.

The mockup lists five items. The app had six routes in the nav (Today,
Habits, Challenges, Calendar, Insights, Settings) and was about to gain a
seventh with the journal. The mockup's five drop Habits and Calendar as
top-level entries without saying where they go.

## Decisions

- **Five primary items; `/habits` and `/calendar` become sub-sections**,
  reached through a segmented tab strip. They stay real, deep-linkable
  routes — no route deletions, no redirects, so every existing URL,
  bookmark, and E2E spec keeps working.
  - Rituals section: `/challenges` ↔ `/habits`
  - Consistency section: `/insights` ↔ `/calendar`
- **Short labels in the nav chrome, full names as page headings.** "Challenges
  & Rituals" and "Consistency & Garden" don't fit a mobile tab label at five
  tabs across. The nav reads Today / Rituals / Consistency / Journal /
  Settings; the `<h1>`s carry the full Sprout & Bloom names.
- **Nav items carry a `matches` prefix list.** Without it, `isActive` would
  highlight nothing while the user is on `/habits` or `/calendar` — the
  single easiest thing to get wrong in this change. `/insights/weekly` is
  already covered by the `/insights` prefix.
- **Section tabs are real `<Link>`s, not the Tabs primitive.** These are
  separate server-rendered routes; links preserve deep-linking,
  back/forward, and prefetching. The active tab is marked with
  `aria-current="page"`, not colour alone.
- **Tabs appear only on the four list pages**, not on create/detail routes
  (`/habits/new`, `/habits/[habitId]`, `/challenges/new`, `/challenges/[id]`,
  `/insights/weekly`) — those are destinations, not siblings.
- **Today's greeting was promoted from `<p>` to `<h1>`.** The page had no
  top-level heading at all, unlike every other route. The greeting stays the
  visible heading (warmer and more personal than a literal "Today's
  Rituals"); the section's full name becomes the route's `metadata.title`.

## Shape

- `src/components/nav/app-nav.tsx` — five `NAV_ITEMS` with `matches`;
  `isActive(pathname, href, matches)` shared by `AppRail` and `AppTabBar`.
- `src/components/nav/section-tabs.tsx` — the segmented `<Link>` pair.
- `src/components/nav/section-tab-items.ts` — `RITUALS_TABS` /
  `CONSISTENCY_TABS`, shared so the two pages in a section can't drift.

Icons: `Sprout` for Consistency (already used by the companion widget, so
the garden metaphor stays consistent) and `BookOpen` for Journal.
