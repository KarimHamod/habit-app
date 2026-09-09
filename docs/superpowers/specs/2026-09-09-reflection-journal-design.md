# Reflection Journal — Design

## Context

Notion task "Add Reflection Journal feature" (Medium): a journal /
gratitude-note feature allowing short daily reflections tied to the user's
habit day.

CLAUDE.md sanctions a reflection journal as gamification but applies a test
to every mechanic: *does it help the user stay consistent, or does it
pressure them into opening the app?* That test drove the scope more than
anything else.

## Decisions

- **One optional free-text reflection per habit-day.** Not per habit (a
  `habit_id` FK plus per-habit history is a much larger surface for little
  gain), and no mood/energy field — that would be a second thing to fill in
  before the first one has proven useful.
- **Nothing is counted, scored, or streaked.** No entry count, no "you
  missed N days", no badge or dot on the nav item. The empty state says
  outright: "There is no streak to keep." A journal with a streak is exactly
  the loss-aversion pattern the product philosophy rules out.
- **`entry_date` is the user's calendar day in their configured timezone**,
  resolved by the caller. The column deliberately has no
  `default current_date` — that would be the server's UTC day and could file
  a reflection under the wrong day near midnight.
- **Backfill is allowed, future-dating is not.** `entryDate` arrives from
  the client, so `saveReflection` re-derives the user's "today" from their
  profile timezone and rejects anything later. Writing yesterday's
  reflection this morning is legitimate.
- **Deleting is its own action**, not "save an empty body". The schema
  requires non-empty text, so an accidental blank save can never silently
  destroy an entry.
- **Today entry point is a side-rail card**, never a row in the habit list —
  CLAUDE.md puts secondary context in the rail and keeps the primary habit
  list uncluttered. The card reads as available, not owed.

## Data model

```sql
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date),
  constraint reflection_body_not_empty check (char_length(btrim(body)) > 0)
);
```

RLS enabled with four policies (select/insert/update/delete), each
`auth.uid() = user_id` — four rather than challenges' three because a
reflection is editable. The `unique (user_id, entry_date)` constraint
already provides the index the history list needs (Postgres scans it
backwards for `order by entry_date desc`), so no separate index is created.
`updated_at` is maintained by the shared `public.set_updated_at()` trigger.

## Shape

- `src/lib/reflections/{types,prompts,validation,data}.ts` — the standard
  domain-module split. `prompts.ts` is pure and picks deterministically from
  the date string, so the prompt is stable for a whole day and can't drift
  across timezones (no `Date` parsing).
- `src/actions/reflections.ts` — `saveReflection` (`useActionState` shape,
  upsert on the unique pair) and `deleteReflection` (direct-call
  discriminated union). Both revalidate `/today` and `/journal`.
- `/journal?date=YYYY-MM-DD` — one route; the search param selects which day
  the editor loads, defaulting to today. No extra route for editing a past
  day.
- `updateProfile` now also revalidates `/journal`, since the journal's
  "today" is timezone-derived.
