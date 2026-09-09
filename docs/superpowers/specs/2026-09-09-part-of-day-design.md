# Part of Day — Design

## Context

Notion task "Group Today's habits by time of day" (Medium): group habit rows
into Morning/Afternoon/Evening sections on Today, matching the "Daily
Intentions" layout in the Sprout & Bloom mockup.

Exploration surfaced a gap the task note didn't mention: **the schema has no
time-of-day field.** The only clock-time column anywhere is
`habit_schedules.reminder_time`, which is notification-only, null for any
habit without a reminder, and never read by `getTodayHabits`.

## Decisions

- **A new explicit `part_of_day` column on `habits`**, not derivation from
  `reminder_time`. Deriving would put nearly every habit in one bucket
  (reminders are off by default) and would couple a display concern to a
  notification setting, so changing a reminder would silently move a habit
  between sections.
- **Four values, `anytime` as the default**: `morning`, `afternoon`,
  `evening`, `anytime`. A CHECK constraint, not a Postgres enum — matching
  `valid_habit_type` / `valid_frequency_type`; this schema uses no
  `create type ... as enum`.
- **Purely a display hint.** It does not participate in scheduling, streak
  calculation, or completion history, and `getTodayHabits` needs no extra
  query — the column arrives with the existing `.select("*")`.
- **No heading when every habit is `anytime`.** A user who never sets a part
  of day would otherwise get a single "Anytime" heading carrying no
  information. Suppressing it means existing accounts see the Today page
  exactly as it looked before this feature.
- **Grouping is a render-time transform** over the already-optimistic habit
  list, so the `useOptimistic` reducer, rollback-on-failure, and the
  midnight-boundary `router.refresh()` guard are untouched.

## Data model

```sql
alter table public.habits
  add column part_of_day text not null default 'anytime';

alter table public.habits
  add constraint valid_part_of_day
  check (part_of_day in ('morning', 'afternoon', 'evening', 'anytime'));
```

No new RLS policies (the existing `habits` policies cover the column) and no
index (Today already filters to one user's active habits and groups a
handful of rows in memory).

## Shape

- `src/lib/habits/part-of-day.ts` — pure: `PartOfDay`, `PART_OF_DAY_ORDER`,
  `PART_OF_DAY_LABELS`, `isPartOfDay`, `groupHabitsByPartOfDay`.
- `TodayHabit` gains `partOfDay`; `getTodayHabits` maps it defensively
  through `isPartOfDay`, falling back to `anytime`.
- Wizard: a `RadioGroup` in the existing **schedule** step, plus a review
  row. Radio semantics rather than a toggle group because exactly one value
  is always selected and the choice must be keyboard-navigable and
  screen-reader-labelled.
- Today: one `<section aria-labelledby>` per group with an `<h2>` carrying
  the label as text and a "N of M done" count.

## Accessibility

Each section is labelled by a real heading, so grouping is never conveyed by
position or colour alone.
