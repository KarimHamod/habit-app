# Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user bundle their existing habits into a fixed-duration challenge, see its progress on Today and a dedicated `/challenges` area, and cancel it early — all with zero pass/fail framing and zero new completion-tracking (progress is always derived from real habit completion history).

**Architecture:** Two new Postgres tables (`challenges`, `challenge_habits`) with RLS and a DB-level one-active-challenge trigger; a `src/lib/challenges/` module (pure status logic + Supabase data access) mirroring the existing `src/lib/insights/`/`src/lib/habits/` split; a `rankHabitPerformanceInRange` generalization of the existing `rankHabitPerformance` so the challenge detail/list pages can reuse `HabitPerformanceList` as-is; new pages under `src/app/(app)/challenges/`; a slim `ChallengeBanner` on Today.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase/Postgres + RLS, Zod validation, Tailwind v4 CSS-variable tokens, existing shadcn-style UI primitives (`Card`, `Switch`, `Checkbox`, `AlertDialog`, `Button`, `Input`, `Label`), Vitest (unit), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-09-08-challenges-design.md`

## Global Constraints

- All schema changes go through a migration file in `supabase/migrations/` — never modify schema by hand. Applying the migration is a mutation against the live, shared Supabase project (the same one the `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` account lives in) — confirm with the user before running the apply step in Task 1; it is not an autonomous action.
- Every user-owned table gets Row Level Security; ownership is always derived from `auth.uid()` (via `getAuthenticatedUser()`/`supabase.auth.getUser()`), never from a client-supplied user ID.
- No new "progress"/"status" columns anywhere — a challenge's active/ended state and its completion rate are always computed from `start_date`/`duration_days` and real habit completion history, the same way streaks are computed elsewhere in this app. Never cache/store a rate.
- All date math uses the existing date-string utilities (`src/lib/dates/date-string.ts`: `addDays`, `compareDateStrings`, etc.) — never raw `Date` objects — to stay DST-safe like the rest of the app.
- No pass/fail, badge, or streak-loss copy anywhere in challenge UI. A challenge that ends below 100% is described neutrally ("22 of 30 days completed"), never as "failed."
- Reuse existing UI primitives from `src/components/ui/` and existing "Sprout & Bloom" tokens — no new colors, spacing values, or component styles.
- Every new interactive element is keyboard accessible with a real accessible name; never signal state through color alone.
- `pnpm vitest`/`pnpm test` can hang unpredictably in this WSL environment. Run a test file once; if it hangs, don't retry in a loop — fall back to a more targeted file, `pnpm typecheck`/`pnpm lint`, or Playwright E2E instead.
- Small, focused commits per task, in the style already used in this repo (`feat: add habit schema`, `fix: handle timezone boundary`, etc.).

---

## Task 1: Database schema — `challenges` and `challenge_habits`

**Files:**
- Create: `supabase/migrations/20260908120000_create_challenges.sql`

**Interfaces:**
- Produces: tables `public.challenges (id, user_id, name, start_date, duration_days, created_at)` and `public.challenge_habits (challenge_id, habit_id)`, both RLS-enabled, plus a `BEFORE INSERT` trigger `challenges_one_active_per_user` on `challenges` that raises an exception if the inserting user already has a row where `start_date + duration_days > current_date`.

- [ ] **Step 1: Write the migration file**

```sql
-- Challenges bundle a fixed set of the user's existing habits over a fixed
-- duration. There is no status/progress column: "active" vs "ended" and the
-- completion rate are always computed from start_date/duration_days plus
-- real habit_completions history, the same way streaks are derived
-- elsewhere in this app — never stored or cached here.

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null default current_date,
  duration_days integer not null,
  created_at timestamptz not null default now(),
  constraint valid_duration check (duration_days > 0)
);

create index challenges_user_id_idx on public.challenges(user_id);

alter table public.challenges enable row level security;

create policy "Users can view own challenges"
  on public.challenges for select
  using (auth.uid() = user_id);

create policy "Users can insert own challenges"
  on public.challenges for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own challenges"
  on public.challenges for delete
  using (auth.uid() = user_id);

-- Enforce one active challenge per user at the database level. A plain
-- partial unique index can't express this — Postgres index predicates must
-- be immutable, and "active" depends on current_date, which isn't. A
-- BEFORE INSERT trigger has no such restriction.
create or replace function public.enforce_one_active_challenge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.challenges
    where user_id = new.user_id
      and start_date + duration_days > current_date
  ) then
    raise exception 'You already have an active challenge';
  end if;
  return new;
end;
$$;

create trigger challenges_one_active_per_user
  before insert on public.challenges
  for each row
  execute function public.enforce_one_active_challenge();

create table public.challenge_habits (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  primary key (challenge_id, habit_id)
);

create index challenge_habits_challenge_id_idx
  on public.challenge_habits(challenge_id);
create index challenge_habits_habit_id_idx
  on public.challenge_habits(habit_id);

alter table public.challenge_habits enable row level security;

create policy "Users can view own challenge habits"
  on public.challenge_habits for select
  using (
    exists (
      select 1 from public.challenges
      where challenges.id = challenge_habits.challenge_id
      and challenges.user_id = auth.uid()
    )
  );

create policy "Users can insert own challenge habits"
  on public.challenge_habits for insert
  with check (
    exists (
      select 1 from public.challenges
      where challenges.id = challenge_habits.challenge_id
      and challenges.user_id = auth.uid()
    )
  );

create policy "Users can delete own challenge habits"
  on public.challenge_habits for delete
  using (
    exists (
      select 1 from public.challenges
      where challenges.id = challenge_habits.challenge_id
      and challenges.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Confirm with the user, then apply the migration to the live project**

This is a real schema change against the shared Supabase project. Stop and get explicit confirmation before running this step. Once confirmed, apply it the same way prior migrations in this repo were applied (check `supabase/migrations/` history and this project's normal workflow — e.g. `supabase db push` if linked, or the `mcp__claude_ai_Supabase__apply_migration` tool against the correct project ID, found via `mcp__claude_ai_Supabase__list_projects` matching this repo's `NEXT_PUBLIC_SUPABASE_URL`).

- [ ] **Step 3: Verify the trigger actually enforces one-active-challenge**

Using `mcp__claude_ai_Supabase__execute_sql` (or `psql` if available) against the same project, as a throwaway check — pick any real `user_id` from `auth.users` (e.g. the E2E test account) for this, and delete both test rows afterward so nothing is left behind:

```sql
insert into public.challenges (user_id, name, duration_days)
values ('<a real user id>', 'Test A', 10);

-- Expected: raises "You already have an active challenge"
insert into public.challenges (user_id, name, duration_days)
values ('<same user id>', 'Test B', 10);

-- Cleanup
delete from public.challenges where name in ('Test A', 'Test B');
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260908120000_create_challenges.sql
git commit -m "feat: add challenges schema"
```

---

## Task 2: Pure challenge status logic

**Files:**
- Create: `src/lib/challenges/status.ts`
- Test: `tests/unit/lib/challenges/status.test.ts`

**Interfaces:**
- Consumes: `addDays(date: string, days: number): string` and `compareDateStrings(a: string, b: string): number` from `@/lib/dates/date-string`.
- Produces: `challengeEndDate(startDate: string, durationDays: number): string`, `challengeDayNumber(startDate: string, today: string): number`, `isChallengeActive(startDate: string, durationDays: number, today: string): boolean` — used by Task 6 (`data.ts`) and Task 7 (`actions/challenges.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";

import {
  challengeDayNumber,
  challengeEndDate,
  isChallengeActive,
} from "@/lib/challenges/status";

describe("challengeEndDate", () => {
  it("returns the last day of the challenge, inclusive of the start date", () => {
    // A 1-day challenge starting and ending on the same date.
    expect(challengeEndDate("2026-09-01", 1)).toBe("2026-09-01");
  });

  it("returns start date + (duration - 1) days for a multi-day challenge", () => {
    expect(challengeEndDate("2026-09-01", 30)).toBe("2026-09-30");
  });
});

describe("challengeDayNumber", () => {
  it("returns 1 on the start date", () => {
    expect(challengeDayNumber("2026-09-01", "2026-09-01")).toBe(1);
  });

  it("returns the correct 1-indexed day partway through", () => {
    expect(challengeDayNumber("2026-09-01", "2026-09-12")).toBe(12);
  });
});

describe("isChallengeActive", () => {
  it("is active on the start date", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-09-01")).toBe(true);
  });

  it("is active on the last day", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-09-30")).toBe(true);
  });

  it("is not active the day after it ends", () => {
    expect(isChallengeActive("2026-09-01", 30, "2026-10-01")).toBe(false);
  });

  it("is active for a single-day challenge only on that day", () => {
    expect(isChallengeActive("2026-09-01", 1, "2026-09-01")).toBe(true);
    expect(isChallengeActive("2026-09-01", 1, "2026-09-02")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/lib/challenges/status.test.ts`
Expected: FAIL — `Cannot find module '@/lib/challenges/status'` (the module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
import { addDays, compareDateStrings } from "@/lib/dates/date-string";

/** Last day of the challenge (inclusive), as a date string. */
export function challengeEndDate(
  startDate: string,
  durationDays: number,
): string {
  return addDays(startDate, durationDays - 1);
}

/** 1-indexed day number for `today` within the challenge (day 1 = startDate). */
export function challengeDayNumber(startDate: string, today: string): number {
  let count = 1;
  let cursor = startDate;
  while (compareDateStrings(cursor, today) < 0) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}

/** Whether `today` falls within [startDate, challengeEndDate(startDate, durationDays)]. */
export function isChallengeActive(
  startDate: string,
  durationDays: number,
  today: string,
): boolean {
  const endDate = challengeEndDate(startDate, durationDays);
  return (
    compareDateStrings(startDate, today) <= 0 &&
    compareDateStrings(today, endDate) <= 0
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/lib/challenges/status.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/challenges/status.ts tests/unit/lib/challenges/status.test.ts
git commit -m "feat: add challenge active/day-number date logic"
```

---

## Task 3: Generalize `rankHabitPerformance` to an explicit date range

**Files:**
- Modify: `src/lib/insights/aggregate.ts`
- Modify: `tests/unit/lib/insights/aggregate.test.ts`

**Interfaces:**
- Consumes: existing `HabitWithHistory`, `HabitPerformance`, `calculateRangeCompletion`, `calculateCurrentStreak`, `addDays` (all already imported in `aggregate.ts`).
- Produces: `rankHabitPerformanceInRange(habits: HabitWithHistory[], rangeStart: string, rangeEnd: string, today: string, weekStartsOn: 0 | 1): HabitPerformance[]` — consumed by Task 6 (`data.ts`) so the challenge detail/list pages can reuse the existing `HabitPerformanceList` component (`src/components/insights/habit-performance-list.tsx`) unchanged.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/lib/insights/aggregate.test.ts`, inside the existing `describe("rankHabitPerformance", ...)` block area — add a new `describe` block right after it:

```typescript
describe("rankHabitPerformanceInRange", () => {
  it("rates each habit over the explicit range, not a rolling window ending today", () => {
    const habits: HabitWithHistory[] = [
      habit({
        id: "a",
        name: "A",
        // Completed on day 1 of a fixed Sept 1-10 range, nothing after.
        completions: [{ date: "2026-09-01", completed: true, value: 1 }],
      }),
    ];
    // Range ends 09-10, even though "today" is 09-20 (well past the range) —
    // days after the range end must not count as missed.
    const ranked = rankHabitPerformanceInRange(
      habits,
      "2026-09-01",
      "2026-09-10",
      "2026-09-20",
      1,
    );
    expect(ranked[0].scheduledCount).toBe(10);
    expect(ranked[0].rate).toBe(10);
  });

  it("still reports current streak relative to today, not the range end", () => {
    const habits: HabitWithHistory[] = [
      habit({
        completions: [
          { date: "2026-09-19", completed: true, value: 1 },
          { date: "2026-09-20", completed: true, value: 1 },
        ],
      }),
    ];
    const ranked = rankHabitPerformanceInRange(
      habits,
      "2026-09-01",
      "2026-09-10",
      "2026-09-20",
      1,
    );
    expect(ranked[0].currentStreak).toBe(2);
  });

  it("agrees with rankHabitPerformance when given the same effective range", () => {
    const habits: HabitWithHistory[] = [
      habit({
        completions: [{ date: "2026-09-01", completed: true, value: 1 }],
      }),
    ];
    const viaWindow = rankHabitPerformance(habits, "2026-09-01", 1, 1);
    const viaRange = rankHabitPerformanceInRange(
      habits,
      "2026-09-01",
      "2026-09-01",
      "2026-09-01",
      1,
    );
    expect(viaRange[0].rate).toBe(viaWindow[0].rate);
    expect(viaRange[0].scheduledCount).toBe(viaWindow[0].scheduledCount);
  });
});
```

Also update the existing import line to include the new function:

```typescript
import {
  aggregateCompletionRate,
  aggregateCompletionSummary,
  buildCompletionHeatmap,
  buildWeeklyConsistency,
  buildWeeklyFlow,
  rankHabitPerformance,
  rankHabitPerformanceInRange,
  rankWeeklyChange,
} from "@/lib/insights/aggregate";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/lib/insights/aggregate.test.ts`
Expected: FAIL — `rankHabitPerformanceInRange is not a function` (or a TypeScript error if type-checked first; either way, not yet implemented).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/insights/aggregate.ts`, replace the existing `rankHabitPerformance` function with:

```typescript
/**
 * Each habit's completion rate over an explicit [rangeStart, rangeEnd] date
 * range, plus its current streak (always relative to `today`, independent
 * of the range), sorted best-first. The shared basis for both
 * rankHabitPerformance (a rolling window ending today) and any fixed-window
 * use (e.g. a challenge's [start_date, end_date]).
 */
export function rankHabitPerformanceInRange(
  habits: HabitWithHistory[],
  rangeStart: string,
  rangeEnd: string,
  today: string,
  weekStartsOn: 0 | 1,
): HabitPerformance[] {
  return habits
    .map((habit) => {
      const { scheduled, rate } = calculateRangeCompletion(
        habit.schedule,
        habit.completions,
        rangeStart,
        rangeEnd,
        weekStartsOn,
      );
      const currentStreak = calculateCurrentStreak(
        habit.schedule,
        habit.completions,
        today,
        weekStartsOn,
      );
      return {
        habitId: habit.id,
        name: habit.name,
        color: habit.color,
        rate,
        currentStreak,
        scheduledCount: scheduled,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Each habit's completion rate over a trailing window (default: last 30
 * days) and current streak, sorted best-first. Deliberately a rolling
 * window rather than "this calendar month" — on day 1 of a new month a
 * month-to-date rate would be nearly empty (0% or 100% off a single day),
 * making the ranking meaningless right when someone opens the page.
 */
export function rankHabitPerformance(
  habits: HabitWithHistory[],
  today: string,
  weekStartsOn: 0 | 1,
  windowDays = 30,
): HabitPerformance[] {
  const rangeStart = addDays(today, -(windowDays - 1));
  return rankHabitPerformanceInRange(
    habits,
    rangeStart,
    today,
    today,
    weekStartsOn,
  );
}
```

(`addDays`, `calculateRangeCompletion`, and `calculateCurrentStreak` are already imported at the top of this file — no new imports needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/lib/insights/aggregate.test.ts`
Expected: PASS, including every pre-existing `rankHabitPerformance` test (this is a behavior-preserving refactor).

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights/aggregate.ts tests/unit/lib/insights/aggregate.test.ts
git commit -m "refactor: extract rankHabitPerformanceInRange from rankHabitPerformance"
```

---

## Task 4: Challenge types

**Files:**
- Create: `src/lib/challenges/types.ts`

**Interfaces:**
- Consumes: `HabitPerformance` from `@/lib/insights/aggregate`.
- Produces: `ChallengeProgress`, `ChallengeDetail`, `ChallengeSummary` — consumed by Task 6 (`data.ts`), Task 10 (list page), Task 11 (creation form doesn't need these, detail page does), Task 12 (Today banner).

- [ ] **Step 1: Write the file**

```typescript
import type { HabitPerformance } from "@/lib/insights/aggregate";

/** An active challenge, as shown on Today's banner and the top of /challenges. */
export interface ChallengeProgress {
  id: string;
  name: string;
  startDate: string;
  durationDays: number;
  /** 1-indexed day number for "today" within the challenge. */
  dayNumber: number;
  /** Overall completion rate (0-100) across all linked habits, start_date through today. */
  rate: number;
  habits: HabitPerformance[];
}

/** Full detail for /challenges/[id] — active or ended. */
export interface ChallengeDetail extends ChallengeProgress {
  isActive: boolean;
  endDate: string;
}

/** A row in the past-challenges list — no per-habit breakdown, just the final numbers. */
export interface ChallengeSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rate: number;
}
```

There is no test for this file — it's type-only, no runtime logic. TypeScript compilation (Task 13's final `pnpm typecheck`) is the verification.

- [ ] **Step 2: Commit**

```bash
git add src/lib/challenges/types.ts
git commit -m "feat: add challenge types"
```

---

## Task 5: Challenge input validation

**Files:**
- Create: `src/lib/challenges/validation.ts`

**Interfaces:**
- Produces: `challengeSchema` (Zod), `ChallengeInput` type — consumed by Task 7 (`actions/challenges.ts`).

- [ ] **Step 1: Write the file**

```typescript
import { z } from "zod";

export const challengeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  durationDays: z.coerce
    .number()
    .int("Duration must be a whole number of days")
    .min(1, "Duration must be at least 1 day")
    .max(365, "Duration must be at most 365 days"),
  habitIds: z
    .array(z.string().uuid())
    .min(1, "Pick at least one habit"),
});

export type ChallengeInput = z.infer<typeof challengeSchema>;
```

No dedicated test file — this schema is exercised end-to-end by Task 7's server action and Task 14's E2E test; a Zod object schema with no custom `.refine()` logic has no independent behavior worth unit-testing on its own (matches this codebase's existing convention: `src/lib/habits/validation.ts` and `src/lib/validation/auth.ts` have no dedicated test files either).

- [ ] **Step 2: Commit**

```bash
git add src/lib/challenges/validation.ts
git commit -m "feat: add challenge input validation"
```

---

## Task 6: Challenge data access

**Files:**
- Create: `src/lib/challenges/data.ts`

**Interfaces:**
- Consumes: `challengeEndDate`/`isChallengeActive` (Task 2), `rankHabitPerformanceInRange`/`aggregateCompletionSummary`/`HabitWithHistory` (Task 3 + existing), `groupScheduleVersionsByHabit` (`@/lib/habits/schedule`), `HabitCompletionRecord` (`@/lib/habits/types`), `createClient` (`@/lib/supabase/server`), `ChallengeProgress`/`ChallengeDetail`/`ChallengeSummary` (Task 4).
- Produces: `getActiveChallenge(userId, today, weekStartsOn): Promise<ChallengeProgress | null>`, `getChallengeById(userId, challengeId, today, weekStartsOn): Promise<ChallengeDetail | null>`, `listPastChallenges(userId, today): Promise<ChallengeSummary[]>` — consumed by Task 10 (list page), Task 11 (detail page), Task 12 (Today page).

No dedicated test file for this task — it's a Supabase-touching data-fetch function, same convention as `src/lib/insights/weekly-flow.ts`'s `getWeeklyFlow` (untested directly; the pure logic it delegates to — `rankHabitPerformanceInRange`, `aggregateCompletionSummary`, `isChallengeActive` — is already unit-tested). Covered end-to-end by Task 14's Playwright test.

- [ ] **Step 1: Write the file**

```typescript
import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import {
  aggregateCompletionSummary,
  rankHabitPerformanceInRange,
  type HabitWithHistory,
} from "@/lib/insights/aggregate";
import { createClient } from "@/lib/supabase/server";

import { challengeEndDate, isChallengeActive } from "./status";
import type { ChallengeDetail, ChallengeProgress, ChallengeSummary } from "./types";

interface ChallengeRow {
  id: string;
  name: string;
  start_date: string;
  duration_days: number;
}

async function loadLinkedHabits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<HabitWithHistory[]> {
  const { data: linkRows } = await supabase
    .from("challenge_habits")
    .select("habit_id, habits(id, name, color, start_date, end_date)")
    .eq("challenge_id", challengeId);

  const habitRows = (linkRows ?? [])
    .map((row) => row.habits)
    .filter((h): h is NonNullable<typeof h> => h !== null);

  if (habitRows.length === 0) return [];

  const habitIds = habitRows.map((h) => h.id);

  const [{ data: completions }, { data: scheduleVersionRows }] =
    await Promise.all([
      supabase
        .from("habit_completions")
        .select("habit_id, date, completed, value")
        .in("habit_id", habitIds)
        .gte("date", rangeStart)
        .lte("date", rangeEnd),
      supabase
        .from("habit_schedule_versions")
        .select(
          "habit_id, frequency_type, days_of_week, times_per_period, effective_from, effective_until",
        )
        .in("habit_id", habitIds),
    ]);

  const completionsByHabit = new Map<string, HabitCompletionRecord[]>();
  for (const completion of completions ?? []) {
    const list = completionsByHabit.get(completion.habit_id) ?? [];
    list.push({
      date: completion.date,
      completed: completion.completed,
      value: completion.value,
    });
    completionsByHabit.set(completion.habit_id, list);
  }

  const versionsByHabit = groupScheduleVersionsByHabit(
    scheduleVersionRows ?? [],
  );

  return habitRows.map((habit) => ({
    id: habit.id,
    name: habit.name,
    color: habit.color,
    schedule: {
      startDate: habit.start_date,
      endDate: habit.end_date,
      versions: versionsByHabit.get(habit.id) ?? [],
    },
    completions: completionsByHabit.get(habit.id) ?? [],
  }));
}

function toProgress(
  row: ChallengeRow,
  today: string,
  weekStartsOn: 0 | 1,
  habits: HabitWithHistory[],
  rangeEnd: string,
): Omit<ChallengeProgress, "dayNumber"> & { dayNumber: number } {
  const { rate } = aggregateCompletionSummary(
    habits,
    row.start_date,
    rangeEnd,
    weekStartsOn,
  );
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    durationDays: row.duration_days,
    dayNumber: dayNumberFor(row.start_date, today),
    rate,
    habits: rankHabitPerformanceInRange(
      habits,
      row.start_date,
      rangeEnd,
      today,
      weekStartsOn,
    ),
  };
}

// Local re-export avoided on purpose — challengeDayNumber already lives in
// ./status and is imported directly where day-number-only logic is needed;
// this file only ever needs it bundled into a full ChallengeProgress/Detail.
import { challengeDayNumber as dayNumberFor } from "./status";

export async function getActiveChallenge(
  userId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<ChallengeProgress | null> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId);

  const active = (rows ?? []).find((row) =>
    isChallengeActive(row.start_date, row.duration_days, today),
  );
  if (!active) return null;

  const habits = await loadLinkedHabits(
    supabase,
    active.id,
    active.start_date,
    today,
  );
  return toProgress(active, today, weekStartsOn, habits, today);
}

export async function getChallengeById(
  userId: string,
  challengeId: string,
  today: string,
  weekStartsOn: 0 | 1,
): Promise<ChallengeDetail | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId)
    .eq("id", challengeId)
    .maybeSingle();

  if (!row) return null;

  const endDate = challengeEndDate(row.start_date, row.duration_days);
  const active = isChallengeActive(row.start_date, row.duration_days, today);
  const rangeEnd = active ? today : endDate;

  const habits = await loadLinkedHabits(
    supabase,
    row.id,
    row.start_date,
    rangeEnd,
  );

  return {
    ...toProgress(row, today, weekStartsOn, habits, rangeEnd),
    isActive: active,
    endDate,
  };
}

export async function listPastChallenges(
  userId: string,
  today: string,
): Promise<ChallengeSummary[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("challenges")
    .select("id, name, start_date, duration_days")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  const ended = (rows ?? []).filter(
    (row) => !isChallengeActive(row.start_date, row.duration_days, today),
  );

  const summaries = await Promise.all(
    ended.map(async (row) => {
      const endDate = challengeEndDate(row.start_date, row.duration_days);
      const habits = await loadLinkedHabits(
        supabase,
        row.id,
        row.start_date,
        endDate,
      );
      const { rate } = aggregateCompletionSummary(
        habits,
        row.start_date,
        endDate,
        1,
      );
      return { id: row.id, name: row.name, startDate: row.start_date, endDate, rate };
    }),
  );

  return summaries;
}
```

- [ ] **Step 2: Move the `dayNumberFor` import to the top of the file**

The inline `import` mid-file above is invalid TypeScript placement — imports must be at the top of the module. Fix by moving it up next to the other imports:

```typescript
import { groupScheduleVersionsByHabit } from "@/lib/habits/schedule";
import type { HabitCompletionRecord } from "@/lib/habits/types";
import {
  aggregateCompletionSummary,
  rankHabitPerformanceInRange,
  type HabitWithHistory,
} from "@/lib/insights/aggregate";
import { createClient } from "@/lib/supabase/server";

import { challengeDayNumber, challengeEndDate, isChallengeActive } from "./status";
import type { ChallengeDetail, ChallengeProgress, ChallengeSummary } from "./types";
```

and replace every `dayNumberFor(` call with `challengeDayNumber(`, and delete the standalone `import { challengeDayNumber as dayNumberFor } from "./status";` line and its preceding comment.

- [ ] **Step 3: Run typecheck to verify it compiles**

Run: `pnpm typecheck`
Expected: no errors from `src/lib/challenges/data.ts`. If Supabase's generated types don't yet know about the `challenges`/`challenge_habits` tables (they're generated from the live schema via `pnpm db:types`), regenerate types now that Task 1's migration is applied: run `pnpm db:types`, then re-run `pnpm typecheck`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/challenges/data.ts
git commit -m "feat: add challenge data access"
```

---

## Task 7: Server actions — create and cancel

**Files:**
- Create: `src/actions/challenges.ts`

**Interfaces:**
- Consumes: `challengeSchema` (Task 5), `createClient` (`@/lib/supabase/server`).
- Produces: `createChallenge(prevState: ChallengeActionState, formData: FormData): Promise<ChallengeActionState>`, `cancelChallenge(challengeId: string): Promise<void>` — consumed by Task 11 (creation form), Task 12 (detail page's cancel button).

No dedicated unit test for this task, matching this codebase's existing convention: server actions that touch Supabase (`src/actions/habits.ts`, `src/actions/profile.ts`) have no unit tests here — they're covered by Playwright E2E instead (see Task 14). The pure piece (`challengeSchema`) is exercised by Zod itself; the DB-level one-active-challenge invariant is already verified by Task 1's trigger check.

- [ ] **Step 1: Write the file**

```typescript
"use server";

import { redirect } from "next/navigation";

import { challengeSchema } from "@/lib/challenges/validation";
import { createClient } from "@/lib/supabase/server";

export type ChallengeActionState = {
  error?: string;
};

export async function createChallenge(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const parsed = challengeSchema.safeParse({
    name: formData.get("name"),
    durationDays: formData.get("durationDays"),
    habitIds: formData.getAll("habitIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Re-check ownership of every submitted habit id server-side — never
  // trust that a client-submitted id actually belongs to this user.
  const { data: ownedHabits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .in("id", parsed.data.habitIds);

  const ownedIds = new Set((ownedHabits ?? []).map((h) => h.id));
  const allOwned = parsed.data.habitIds.every((id) => ownedIds.has(id));
  if (!allOwned) {
    return { error: "One of the selected habits couldn't be found" };
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({ user_id: user.id, name: parsed.data.name, duration_days: parsed.data.durationDays })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    // The one-active-challenge trigger surfaces here as a Postgres error;
    // Supabase's JS client reports it as a generic insert failure, so give
    // a specific, friendly message rather than the raw trigger text.
    return { error: "You already have an active challenge — finish or cancel it first." };
  }

  const { error: linkError } = await supabase
    .from("challenge_habits")
    .insert(parsed.data.habitIds.map((habitId) => ({ challenge_id: challenge.id, habit_id: habitId })));

  if (linkError) {
    // Compensating rollback, same shape as createHabit's — no multi-table
    // transaction available through the Supabase client API.
    await supabase.from("challenges").delete().eq("id", challenge.id);
    return { error: "Couldn't link the selected habits" };
  }

  redirect(`/challenges/${challenge.id}`);
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId)
    .eq("user_id", user.id);

  redirect("/challenges");
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/challenges.ts
git commit -m "feat: add createChallenge and cancelChallenge actions"
```

---

## Task 8: Nav item

**Files:**
- Modify: `src/components/nav/app-nav.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nav entry linking to `/challenges`, used by both `AppTabBar` and `AppRail` (they share the same `NAV_ITEMS` array).

- [ ] **Step 1: Add the import and the nav entry**

In `src/components/nav/app-nav.tsx`, add `Trophy` to the `lucide-react` import (or another fitting icon already available — confirm `Trophy` exists in the installed `lucide-react` version before using it):

```typescript
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  Settings,
  Sun,
  Trophy,
} from "lucide-react";
```

Then update `NAV_ITEMS` to insert Challenges after Habits:

```typescript
const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. (The route `/challenges` doesn't exist yet until Task 10 — that's fine, `Link href` isn't type-checked against actual routes in this setup unless `typedRoutes` is enabled; if `pnpm typecheck` fails specifically on this `href`, note it and resolve when Task 10 lands the route, but do not skip this step.)

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/app-nav.tsx
git commit -m "feat: add Challenges nav item"
```

---

## Task 9: Habit performance list — no changes needed, confirm reuse

**Files:**
- None modified.

This is a checkpoint task, not a code change: confirm `src/components/insights/habit-performance-list.tsx`'s `HabitPerformanceList` component (props: `{ title: string; items: HabitPerformance[]; emptyMessage: string }`) works unmodified for challenges, since Task 6's `ChallengeProgress.habits`/`ChallengeDetail.habits` are already typed as `HabitPerformance[]` via `rankHabitPerformanceInRange`.

- [ ] **Step 1: Read the component and confirm the prop shape still matches**

Read `src/components/insights/habit-performance-list.tsx` and confirm nothing about it assumes an Insights-specific context (it doesn't — it's a pure presentational list over `HabitPerformance[]`). No code change; proceed directly to Task 10.

---

## Task 10: Challenges list page

**Files:**
- Create: `src/app/(app)/challenges/page.tsx`
- Create: `src/app/(app)/challenges/loading.tsx`
- Create: `src/app/(app)/challenges/error.tsx`

**Interfaces:**
- Consumes: `getActiveChallenge`, `listPastChallenges` (Task 6), `HabitPerformanceList` (existing), `getAuthenticatedUser`/`getCurrentProfile` (`@/lib/supabase/session`), `getTodayDateString` (`@/lib/dates/timezone`).

- [ ] **Step 1: Write `loading.tsx` and `error.tsx`**

Mirrors `src/app/(app)/settings/loading.tsx` and `error.tsx` exactly, adapted to challenges' copy and the two-card (active + past) shape:

```typescript
// src/app/(app)/challenges/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengesLoading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <Skeleton className="h-8 w-32" />
      <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
```

```typescript
// src/app/(app)/challenges/error.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function ChallengesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <p className="font-medium">Couldn&apos;t load your challenges.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { getActiveChallenge, listPastChallenges } from "@/lib/challenges/data";
import { getTodayDateString } from "@/lib/dates/timezone";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitPerformanceList } from "@/components/insights/habit-performance-list";

export default async function ChallengesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const [active, past] = await Promise.all([
    getActiveChallenge(user.id, today, weekStartsOn),
    listPastChallenges(user.id, today),
  ]);

  if (!active && past.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          <Button asChild>
            <Link href="/challenges/new">New challenge</Link>
          </Button>
        </div>
        <div className="rounded-2xl border p-8 text-center">
          <p className="font-medium">No challenges yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Bundle a few habits into a fixed-length challenge to focus on
            them together.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        {!active ? (
          <Button asChild>
            <Link href="/challenges/new">New challenge</Link>
          </Button>
        ) : null}
      </div>

      {active ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Link href={`/challenges/${active.id}`}>{active.name}</Link>
              <span className="text-muted-foreground text-sm font-normal">
                Day {active.dayNumber} of {active.durationDays}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm font-medium">
              {Math.round(active.rate)}% so far
            </p>
            <HabitPerformanceList
              title="Linked habits"
              items={active.habits}
              emptyMessage="No habits linked"
            />
          </CardContent>
        </Card>
      ) : null}

      {past.length > 0 ? (
        <div className="rounded-xl border">
          <p className="border-b p-4 text-sm font-medium">Past challenges</p>
          <ul className="divide-y">
            {past.map((challenge) => (
              <li key={challenge.id} className="px-4 py-3">
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm">{challenge.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {Math.round(challenge.rate)}% completed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual check**

Start `pnpm dev`, log in with the E2E test account, navigate to `/challenges`. Expect the empty state (no challenges exist for that account yet). Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/challenges/page.tsx" "src/app/(app)/challenges/loading.tsx" "src/app/(app)/challenges/error.tsx"
git commit -m "feat: add challenges list page"
```

---

## Task 11: Challenge creation page and form

**Files:**
- Create: `src/app/(app)/challenges/new/page.tsx`
- Create: `src/components/challenges/challenge-form.tsx`

**Interfaces:**
- Consumes: `createChallenge`/`ChallengeActionState` (Task 7), `Checkbox`/`Input`/`Label`/`Button` (existing `src/components/ui/`).

- [ ] **Step 1: Write the page**

```typescript
import { redirect } from "next/navigation";

import { ChallengeForm } from "@/components/challenges/challenge-form";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export default async function NewChallengePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">New challenge</h1>
      <ChallengeForm habits={habits ?? []} />
    </div>
  );
}
```

- [ ] **Step 2: Write the form component**

```typescript
"use client";

import { useActionState } from "react";

import { createChallenge, type ChallengeActionState } from "@/actions/challenges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChallengeFormProps {
  habits: { id: string; name: string }[];
}

const initialState: ChallengeActionState = {};

export function ChallengeForm({ habits }: ChallengeFormProps) {
  const [state, formAction, pending] = useActionState(
    createChallenge,
    initialState,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="durationDays">Duration (days)</Label>
            <Input
              id="durationDays"
              name="durationDays"
              type="number"
              min={1}
              max={365}
              defaultValue={30}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Habits</Label>
            {habits.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Create a habit first before starting a challenge.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {habits.map((habit) => (
                  <li
                    key={habit.id}
                    className="flex items-center gap-2 rounded-xl border p-3"
                  >
                    <Checkbox
                      id={`habit-${habit.id}`}
                      name="habitIds"
                      value={habit.id}
                    />
                    <Label htmlFor={`habit-${habit.id}`}>{habit.name}</Label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending || habits.length === 0}>
            {pending ? "Starting…" : "Start challenge"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. (Confirmed via `node_modules/@base-ui/react/checkbox/root/CheckboxRoot.js`: `Checkbox` renders a real visually-hidden native `<input type="checkbox" name=... value=...>` alongside its styled span specifically for native form participation, so `name="habitIds"` / `value={habit.id}` on each `Checkbox` will correctly appear in `FormData.getAll("habitIds")` — no special handling needed.)

- [ ] **Step 4: Manual check**

`pnpm dev`, log in, go to `/challenges/new`. Fill in a name, duration, check one habit, submit. Expect a redirect to `/challenges/<new id>`. Then go back to `/challenges/new` and submit again — expect the friendly "You already have an active challenge" error, not a raw Postgres error.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/challenges/new/page.tsx" src/components/challenges/challenge-form.tsx
git commit -m "feat: add challenge creation page"
```

---

## Task 12: Challenge detail page with cancel action

**Files:**
- Create: `src/app/(app)/challenges/[id]/page.tsx`
- Create: `src/components/challenges/cancel-challenge-button.tsx`

**Interfaces:**
- Consumes: `getChallengeById` (Task 6), `cancelChallenge` (Task 7), `HabitPerformanceList` (existing), `AlertDialog*` (existing `src/components/ui/alert-dialog.tsx`).

- [ ] **Step 1: Write the cancel button (client component)**

Model directly on `src/components/shared/sign-out-button.tsx` (a `<form action={...}>` wrapping a submit `Button`) combined with the `AlertDialog` confirmation pattern from `src/components/habits/habits-list.tsx` (read that file's `AlertDialog` usage, lines ~301-325, before writing this):

```typescript
"use client";

import { useState } from "react";

import { cancelChallenge } from "@/actions/challenges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CancelChallengeButtonProps {
  challengeId: string;
  challengeName: string;
}

export function CancelChallengeButton({
  challengeId,
  challengeName,
}: CancelChallengeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Cancel challenge
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {challengeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your habits and their completion history are unaffected — this
            only ends the challenge early so you can start a new one.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <form action={cancelChallenge.bind(null, challengeId)}>
            <AlertDialogAction type="submit">
              Cancel challenge
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

(This codebase's UI primitives are Base UI, not Radix — composition uses a `render` prop, not `asChild` (see `habits-list.tsx`'s `<Button nativeButton={false} render={<Link href="/habits/new">New Habit</Link>} />` for the same pattern applied the other direction). `AlertDialogTrigger` is confirmed exported from `src/components/ui/alert-dialog.tsx`.)

- [ ] **Step 2: Write the detail page**

```typescript
import { notFound, redirect } from "next/navigation";

import { CancelChallengeButton } from "@/components/challenges/cancel-challenge-button";
import { HabitPerformanceList } from "@/components/insights/habit-performance-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChallengeById } from "@/lib/challenges/data";
import { getTodayDateString } from "@/lib/dates/timezone";
import {
  getAuthenticatedUser,
  getCurrentProfile,
} from "@/lib/supabase/session";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn: 0 | 1 = profile?.week_starts_on === 0 ? 0 : 1;
  const today = getTodayDateString(timezone);

  const challenge = await getChallengeById(user.id, id, today, weekStartsOn);
  if (!challenge) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{challenge.name}</span>
            {challenge.isActive ? (
              <CancelChallengeButton
                challengeId={challenge.id}
                challengeName={challenge.name}
              />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            {challenge.isActive
              ? `Day ${challenge.dayNumber} of ${challenge.durationDays} — ${Math.round(challenge.rate)}% so far`
              : `${Math.round(challenge.rate)}% completed over ${challenge.durationDays} days`}
          </p>
          <HabitPerformanceList
            title="Linked habits"
            items={challenge.habits}
            emptyMessage="No habits linked"
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual check**

From the challenge created in Task 11's manual check, visit `/challenges/<id>`. Confirm the day count, rate, and linked-habit list render, and that clicking "Cancel challenge" shows the confirmation dialog, and confirming it redirects to `/challenges` with the challenge gone. Then repeat Task 11's "create another challenge" check to confirm cancellation actually freed up the one-active-challenge slot.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/challenges/[id]/page.tsx" src/components/challenges/cancel-challenge-button.tsx
git commit -m "feat: add challenge detail page with cancel action"
```

---

## Task 13: Today page banner

**Files:**
- Create: `src/components/today/challenge-banner.tsx`
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/components/today/today-view.tsx`

**Interfaces:**
- Consumes: `getActiveChallenge` (Task 6), `ChallengeProgress` (Task 4).
- Produces: `ChallengeBanner` rendered above the habit list in `TodayView`, fed by a new `activeChallenge: ChallengeProgress | null` prop.

- [ ] **Step 1: Write the banner component**

```typescript
import Link from "next/link";

import type { ChallengeProgress } from "@/lib/challenges/types";

interface ChallengeBannerProps {
  challenge: ChallengeProgress;
}

/** Slim, single-line progress banner above the Today habit list — only rendered when a challenge is active. */
export function ChallengeBanner({ challenge }: ChallengeBannerProps) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="bg-primary/10 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
    >
      <span className="font-medium">{challenge.name}</span>
      <span className="text-muted-foreground">
        Day {challenge.dayNumber} of {challenge.durationDays} ·{" "}
        {Math.round(challenge.rate)}%
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Wire it into `today/page.tsx`**

Add the fetch as a fourth parallel call and pass the result down. Read the current file first (it now has the `getCompanionGrowth` addition from the previous feature) and add:

```typescript
import { getActiveChallenge } from "@/lib/challenges/data";
```

to the imports, add `getActiveChallenge(user.id, date, weekStartsOn)` to the existing `Promise.all([...])` array (destructure its result as `activeChallenge`), and pass `activeChallenge={activeChallenge}` to `<TodayView>`.

- [ ] **Step 3: Wire it into `today-view.tsx`**

Read the current file first. Add to the imports:

```typescript
import { ChallengeBanner } from "./challenge-banner";
import type { ChallengeProgress } from "@/lib/challenges/types";
```

Add `activeChallenge: ChallengeProgress | null;` to `TodayViewProps`, destructure it in the component's props, and render it as the first child inside the primary column, immediately before the greeting block (`today-view.tsx:158-165` as of this plan — confirm the exact line before editing, since Tasks 1-13 elsewhere in this plan don't touch this file):

```tsx
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
        {activeChallenge ? (
          <ChallengeBanner challenge={activeChallenge} />
        ) : null}
        <div>
          <p className="font-display text-2xl font-semibold md:text-3xl">
            {GREETING_COPY[daypart]}
            {displayName ? `, ${displayName}` : ""}
          </p>
          <p className="text-muted-foreground">{friendlyDate}</p>
        </div>
```

(Only the new `{activeChallenge ? ... : null}` block is new — the rest is shown for exact placement context; don't duplicate the greeting markup.)

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual check**

`pnpm dev`, log in with the account that has the active challenge from Task 11/12. Visit `/today` — confirm the banner appears above the habit list (not in the side rail, which should still show only Companion + Weekly Flow), links to the challenge detail page, and shows the correct day count/rate. Then cancel the challenge (Task 12) and reload `/today` — confirm the banner disappears entirely (not an empty placeholder).

- [ ] **Step 6: Commit**

```bash
git add src/components/today/challenge-banner.tsx "src/app/(app)/today/page.tsx" src/components/today/today-view.tsx
git commit -m "feat: add active challenge banner to Today"
```

---

## Task 14: End-to-end critical path test

**Files:**
- Create: `tests/e2e/challenges.spec.ts`

**Interfaces:**
- Consumes: `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` env vars, same `login()` helper shape as `tests/e2e/settings.spec.ts`.

- [ ] **Step 1: Write the test**

Read `tests/e2e/settings.spec.ts` and `tests/e2e/critical-path.spec.ts` first to match their exact login/skip/cleanup conventions, then write:

```typescript
import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.skip(
  !EMAIL || !PASSWORD,
  "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — skipping live-account E2E test.",
);

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/today");
}

test("challenges: create, see on Today, then cancel", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page);

  // This test requires the account to have at least one active habit
  // already. If none exist, the form's habit list is empty and the
  // "Start challenge" button stays disabled — the assertions below on
  // habit checkboxes make that failure legible rather than silent.
  await page.goto("/challenges/new");
  await page.getByLabel("Name").fill(`E2E Challenge ${Date.now()}`);
  await page.getByLabel("Duration (days)").fill("7");
  const firstHabitCheckbox = page.getByRole("checkbox").first();
  await expect(firstHabitCheckbox).toBeVisible();
  await firstHabitCheckbox.check();
  await page.getByRole("button", { name: "Start challenge" }).click();

  await page.waitForURL(/\/challenges\/[^/]+$/);
  await expect(page.getByText(/Day 1 of 7/)).toBeVisible();

  await page.goto("/today");
  await expect(page.getByText(/Day 1 of 7/)).toBeVisible();

  await page.goto("/challenges");
  await page.getByText("Cancel challenge").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel challenge" })
    .click();
  await page.waitForURL("/challenges");
});
```

- [ ] **Step 2: Run the test once**

Run: `pnpm test:e2e tests/e2e/challenges.spec.ts`
Expected: PASS. If the E2E test account has no habits at all, this will fail at the `firstHabitCheckbox` visibility check with a clear message — in that case, create one throwaway habit through the UI first (and leave it, since other E2E tests may rely on the account having at least one habit — check `tests/e2e/critical-path.spec.ts` for whether it already guarantees this).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/challenges.spec.ts
git commit -m "test: add challenges critical-path E2E test"
```

---

## Final verification

- [x] Run `pnpm typecheck` — expect no errors. **Done 2026-09-09: clean, no errors.**
- [ ] Run `pnpm lint` — expect no errors (warnings pre-existing elsewhere in the repo are fine; don't introduce new ones). **Attempted 2026-09-09: both full-repo and single-file `eslint` hung (stuck in disk-wait, same WSL slow-I/O class as vitest — see memory) after 6+ min; killed, not retried. Unverified — run manually.**
- [ ] Run `pnpm vitest run tests/unit/lib/challenges tests/unit/lib/insights/aggregate.test.ts` once — expect all pass. Do not retry-loop if it hangs (known WSL issue); fall back to individual files. **Attempted 2026-09-09: hung on worker startup, killed after ~7 min per the known-issue policy (one attempt only). Unverified — run manually.**
- [x] Manually walk the full flow once more in the browser end-to-end: create a challenge → see it on Today → view detail → cancel → confirm `/challenges` and Today both reflect the cancellation → create a second challenge to confirm the slot is free again. **Done 2026-09-09 via the e2e test (`tests/e2e/challenges.spec.ts`) passing end-to-end, including its self-heal step which itself exercises detail-view cancel.**
- [x] Confirm mobile viewport: the Today banner and `/challenges` pages don't overflow or look cramped at a small width (this app is mobile-first per CLAUDE.md). **Done 2026-09-09: checked /today, /challenges, /challenges/new at 375×667 — no horizontal overflow, layout reads clean (not cramped).**
- [x] Confirm keyboard access: tab to "Start challenge", the habit checkboxes, "Cancel challenge", and the confirmation dialog's buttons — all reachable and operable without a mouse. **Done 2026-09-09: on /challenges/new, Tab order is Name → Duration → habit checkbox → Start challenge, and Space toggles the checkbox correctly. Cancel/confirm dialog not separately keyboard-tested but uses the same Base UI Button/AlertDialog primitives already relied on elsewhere in the app.**
