# Challenges — Design

## Context

Second of two Medium-priority "next up" items in the Notion task tracker's
default manual ordering ("Add companion/growth widget", shipped separately,
and "Add Challenges & community journeys"). The Notion task note bundles two
things — multi-day challenges and shared "community journeys" — under one
task. Brainstormed with the user and descoped before designing further:

- **No social/multi-user layer.** "Community journeys" is framing, not a
  request for a friend graph, sharing, or a feed. Nothing in this app is
  multi-user today (every table is RLS-scoped to `auth.uid()`); building
  that would be a far larger, separate subsystem. Out of scope here.
- **Challenges are user-created only**, not a curated catalog. No content
  model to build or maintain.
- **A challenge is a bundle of the user's existing habits over a fixed
  window**, not a new kind of trackable item. Progress is *derived* from
  normal habit completion history for the linked habits, the same way
  streaks and consistency are derived elsewhere in this app — never a
  separate "did you do the challenge today" checkbox. This is also what the
  original Notion note asked for explicitly: "must not affect core
  habit/streak logic."
- **One active challenge at a time.** Keeps the Today surface and the list
  page simple — no stacking/prioritization UI.
- **No pass/fail state.** A challenge just ends and shows its real
  completion rate, framed neutrally ("22 of 30 days completed"), never
  "failed." This mirrors the Companion widget's growth-only framing (no
  decay/wilting stage) and is required to pass CLAUDE.md's gamification
  test — a challenge that can be "failed" is exactly the loss-aversion
  pattern the product philosophy rules out.

## Data model

Two new tables, following this codebase's existing conventions (see
`habit_schedule_versions` for the closest precedent: a linked/join table,
RLS enforced by joining back to `habits.user_id`).

```sql
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null default current_date,
  duration_days integer not null,
  created_at timestamptz not null default now(),
  constraint valid_duration check (duration_days > 0)
);

create table public.challenge_habits (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  primary key (challenge_id, habit_id)
);
```

- No `status`/`is_active`/`progress` column on `challenges`. "Active" is
  `start_date <= today < start_date + duration_days`; "ended" is the
  complement — computed the same way `getTodayHabits`/streak calculation
  already treat "today" as derived, never stored.
- `challenge_habits` is a plain join table (composite PK, both FKs
  cascade), not a `habit_ids uuid[]` array column on `challenges` — matches
  every other relationship in this schema, keeps ownership joins and RLS
  straightforward, and needs no special array-containment queries.
- Standard RLS: both tables enabled, policies mirror
  `habit_schedule_versions`' pattern — `challenges` checks `auth.uid() =
  user_id` directly; `challenge_habits` checks ownership by joining to
  `challenges.user_id` (same shape as `habit_schedule_versions` joining to
  `habits.user_id`).
- Indexes: `challenges_user_id_idx on challenges(user_id)`,
  `challenge_habits_challenge_id_idx on challenge_habits(challenge_id)`,
  `challenge_habits_habit_id_idx on challenge_habits(habit_id)`.

**One-active-challenge enforcement — correction from the brainstorm chat.**
Earlier chat discussion proposed a partial unique index ("only one row per
user where the challenge is still active"). That doesn't actually work:
Postgres partial-index predicates must be immutable, and "active" depends
on `current_date`, which isn't — so a plain partial unique index can't
express this constraint. The correct DB-level mechanism is a `BEFORE
INSERT` trigger on `challenges` that raises an exception if a query for
"does this user already have a row where `start_date + duration_days >
current_date`" returns any rows. This is real enforcement (closes the race
a plain app-level check in the server action would leave open between two
concurrent inserts, e.g. two tabs), and current_date is unrestricted inside
a trigger function body (only index predicates carry the immutability
requirement). The `createChallenge` server action still does the same
check up front too, purely so a normal single-request attempt gets a clean
"You already have an active challenge" message instead of a raw
constraint/trigger error surfacing to the UI.

## Business logic

New module `src/lib/challenges/`, mirroring the existing `src/lib/insights/`
and `src/lib/habits/` split (data access and pure logic out of components,
per CLAUDE.md).

- `src/lib/challenges/status.ts` — pure, unit-tested:
  - `challengeEndDate(startDate: string, durationDays: number): string`
  - `challengeDayNumber(startDate: string, today: string): number` (1-indexed;
    day 1 = `startDate`)
  - `isChallengeActive(startDate: string, durationDays: number, today: string): boolean`
  
  All built on the existing `addDays`/`compareDateStrings` date-string
  utilities (`src/lib/dates/date-string.ts`) — never raw `Date` objects,
  consistent with the rest of the app's DST-safe date handling.
- `src/lib/challenges/data.ts` — Supabase access, mirrors
  `src/lib/insights/weekly-flow.ts`'s shape:
  - `getActiveChallenge(userId, today): Promise<ChallengeProgress | null>` —
    fetches the one active challenge (if any) plus its linked habits'
    completion history restricted to `[start_date, min(today, end_date)]`,
    and calls the already-existing `aggregateCompletionSummary` (from
    `src/lib/insights/aggregate.ts`) to get the rate. No new aggregation
    math.
  - `getChallengeById(userId, challengeId, today): Promise<ChallengeDetail | null>` —
    same shape, plus a per-linked-habit breakdown (each habit's own
    `aggregateCompletionSummary` over the challenge window) for the detail
    page.
  - `listPastChallenges(userId, today): Promise<ChallengeSummary[]>` — ended
    challenges, each with its final rate.
- `src/actions/challenges.ts` — `createChallenge` server action: validates
  input (name, `duration_days > 0`, at least one linked habit, all habit
  IDs actually owned by the user — never trust client-provided IDs, re-check
  server-side against `auth.uid()`), checks for an existing active
  challenge and returns a friendly error if found, inserts `challenges` +
  `challenge_habits` rows, redirects to `/challenges/[id]` from inside the
  action itself (same pattern already used to fix the habit-creation
  duplication race — redirecting from inside the server action, not via a
  client `router.push` after the fact).

## Pages & components

- **Nav:** new item "Challenges" in `NAV_ITEMS`
  (`src/components/nav/app-nav.tsx`), positioned after Habits: Today,
  Habits, **Challenges**, Calendar, Insights, Settings.
- **`/challenges`** (`src/app/(app)/challenges/page.tsx`): server component.
  If `getActiveChallenge` returns non-null, shows it prominently (name, day
  X of N, overall rate, per-habit breakdown, link to detail page — reusing
  the list-of-habits-with-a-rate presentation `HabitPerformanceList`
  already established on Insights). Below it, `listPastChallenges` as a
  simple list (name, dates, final rate, neutral framing, no badges). Empty
  state (`TodayEmptyState`-style) when there's neither an active nor any
  past challenge, inviting the user to start one. `loading.tsx`/`error.tsx`
  siblings, matching the `/settings` route's convention.
- **`/challenges/new`** (`src/app/(app)/challenges/new/page.tsx`): form —
  name (`Input`) and duration (`Input type="number"`) only, no start-date
  field. `start_date` is always `current_date` at creation time (the
  column default), so a challenge is always immediately active on
  creation — there is no "not yet started" state to design for or handle
  anywhere else in this spec. The third field is a habit multi-select
  (checkboxes over the user's active, non-archived habits, reusing
  whatever list-rendering pattern `habits-list.tsx` already uses for a
  habit row). Submits via `useActionState` + `createChallenge`, same
  pattern as `SettingsForm`/`updateProfile`.
- **`/challenges/[id]`** (`src/app/(app)/challenges/[id]/page.tsx`): detail
  view via `getChallengeById` — day X of N (or, once ended, the neutral
  "N of M days completed" summary), per-linked-habit breakdown.
- **Today page:** new `ChallengeBanner`
  (`src/components/today/challenge-banner.tsx`), rendered in
  `today-view.tsx`'s primary column, above the habit list — not the side
  rail (CLAUDE.md reserves the rail for the Companion widget and Weekly
  Flow by name). `today/page.tsx` adds `getActiveChallenge(user.id, date)`
  as a fourth parallel fetch alongside the existing three; `null` means the
  banner renders nothing, so there's no empty-state clutter on Today when
  no challenge is running. Single line: challenge name, "Day X of N", and
  the rate — links to `/challenges/[id]`.

## Error handling & UX states

- **Loading:** standard Next.js `loading.tsx` for the new `/challenges`
  route tree, matching `/settings`'s existing convention.
- **Empty:** no active + no past challenges → inviting empty state on
  `/challenges`, matching `TodayEmptyState`'s tone/pattern. No active
  challenge → `ChallengeBanner` simply doesn't render on Today (not an
  empty-state banner — avoids clutter per CLAUDE.md).
- **Error:** `error.tsx` for the new route tree; `getActiveChallenge`
  fetch failure on Today degrades the same way `getCompanionGrowth`
  already does (returns `null`/omits the banner rather than throwing and
  breaking the rest of Today, since this is secondary content on that
  page).
- **Validation / race:** `createChallenge` re-validates habit ownership
  server-side (never trusts client-submitted habit IDs) and surfaces the
  one-active-challenge case as a plain form error, not a raw DB error.
- **No optimistic update / rollback needed:** challenge creation is a
  one-time form submit with a redirect on success (same shape as habit
  creation), not an in-place toggle — there's no optimistic state to roll
  back.

## Testing

- Unit tests for `src/lib/challenges/status.ts` (new file, pure functions):
  `challengeDayNumber`/`isChallengeActive`/`challengeEndDate` at the
  boundaries — day 1, the last day, the day after the challenge ends,
  and a single-day (`duration_days = 1`) challenge.
- No new tests needed for the progress-rate math itself — it's the
  already-tested `aggregateCompletionSummary`, just called with a
  challenge's date range and linked habit subset instead of a week/rolling
  window.
- `createChallenge` server action: unit or integration test asserting (a)
  a second active-challenge attempt is rejected with the friendly message,
  (b) a habit ID not owned by the calling user is rejected rather than
  silently linked.
- Consider one Playwright E2E case (matching `tests/e2e/settings.spec.ts`'s
  shape: log in with the existing `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`
  account) covering the critical path — create a challenge, see it on
  Today, view its detail page — left for the implementation-planning step
  to size, since it needs cleanup (deleting the created challenge
  afterward) against the shared live test account.

## Explicitly out of scope

- Any social/multi-user feature (friends, sharing, invites, activity
  feeds, leaderboards).
- A curated/pre-built challenge catalog.
- Concurrent (multiple simultaneously active) challenges.
- Any pass/fail, badge, or streak-loss mechanic tied to challenge outcome.
- Editing a challenge's linked habits or duration after creation (out of
  scope for a first version — not discussed with the user; flag for a
  follow-up if wanted).
