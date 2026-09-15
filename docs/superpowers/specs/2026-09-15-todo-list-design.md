# To-Do List — Design

## Context

A Stitch mock ("To-Do List & Focus - Sprout & Bloom") proposed a full
productivity surface alongside the habit list: tagged/timed task cards with
subtask progress, a "Top 3 Essentials" / "Quick Wins" split, a 25-minute
Pomodoro focus timer, and an "Energy Distribution" matrix — all on the
mock's own gold/green Material palette and Epilogue/Plus Jakarta Sans, not
this app's actual design system.

Reviewed against CLAUDE.md's gamification test (*does it help the user stay
consistent, or does it pressure them into opening the app?*) and against
"avoid clutter in the primary list," most of the mock doesn't earn its
place: a Pomodoro timer and an energy chart are generic productivity
features with no habit-consistency framing, and the tag/time-estimate/
subtask density belongs to a different kind of app. This spec keeps the
one part of the mock that is genuinely useful — a place to jot down
non-habit tasks — and cuts everything else.

## Decisions

- **Cut the Pomodoro timer and Energy Distribution matrix entirely.**
  Neither survives the gamification test as designed, and CLAUDE.md is
  explicit that a mechanic failing that test gets cut regardless of how it
  looks in a mockup.
- **Minimal fields: title, done, parked.** No tags, time estimates, due
  times, attachments, or subtasks. Every other feature in this app
  (reflections, challenges) started lean; richer fields are a follow-up
  task if this proves useful, not a v1 requirement.
- **Two sections, not three.** "To do" (active) and "Later" (parked),
  collapsible and hidden entirely when empty — same rule `today-view.tsx`
  already applies to part-of-day groups with nothing in them. No separate
  "Top 3 Essentials" hero, since that needs a priority field we aren't
  building.
- **Completed items stay in place, struck through** — not moved to a
  separate "Completed" list. This matches how habit cards toggle in place
  on Today rather than migrating between lists.
- **Parking is a per-item action, not a second add flow.** Quick-add always
  creates an active item; a "Move to Later" / "Un-park" toggle moves it.
  One input to learn, not two.
- **Deletion is included**, even though the mock has none — an unbounded
  personal to-do list needs a way to remove stale items, unlike a habit
  (archive) or reflection (the entry itself is the point).
- **New top-level nav item**, not folded into Journal or Today's side rail.
  To-dos are a distinct, personal, non-habit-scheduling surface — same
  category as Today or Journal, not secondary context for either. Sits
  second in `NAV_ITEMS`, between Today and Rituals, matching the mock's own
  ordering. The mobile tab bar goes from five items to six; verify it
  still fits comfortably at phone width before calling this done, and use
  a compact icon-plus-short-label like the existing five.
- **Fully restyled onto Sunny Citrus** (`src/app/globals.css` tokens,
  Outfit/Nunito Sans, existing `Card`/button/checkbox primitives) — nothing
  from the mock's own generated palette or fonts is used. The mock's *layout
  shape* (a list with a quick-add row and a collapsible parked section) is
  the only thing carried over.

## Data model

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done_at timestamptz,
  parked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint todo_title_not_empty check (char_length(btrim(title)) > 0)
);

create index todos_user_id_idx on public.todos(user_id, created_at);

alter table public.todos enable row level security;
-- four policies (select/insert/update/delete), each auth.uid() = user_id,
-- same shape as reflections (a todo is editable: toggling done_at and
-- parked are both updates).
```

`done_at` (nullable timestamptz) rather than a boolean, matching
`habit_completions.completed_at` — not used for any "completed at this
time" display in v1, but costs nothing and avoids a future migration if
that's ever wanted. No `updated_at`/trigger: nothing here is edited after
creation except the two flags, and neither needs an audit trail.

## Shape

- `src/lib/todos/{types,data}.ts` — the standard domain-module split.
  `data.ts` exports `listTodos(userId)` returning active and parked items
  (one query, split client- or server-side by `parked`); no `validation.ts`
  needed since the only user input is a title, validated inline in the
  action.
- `src/actions/todos.ts` — `createTodo(title)`, `toggleTodo(id, done)`,
  `parkTodo(id, parked)`, `deleteTodo(id)`. Each resolves the user via
  `supabase.auth.getUser()`, never a client-supplied id, and revalidates
  `/todos`. Same discriminated-union `{ success: true } | { error }` return
  shape as `completions.ts`.
- `src/app/(app)/todos/{page,loading,error}.tsx` — server page loads via
  `listTodos`, passes to a client view; `loading`/`error` follow the
  `journal` route's pattern.
- `src/components/todos/{todo-list-view,todo-item,todo-quick-add}.tsx` —
  `todo-list-view.tsx` is `"use client"`, using `useOptimistic` +
  `useTransition` for create/toggle/park/delete with rollback on any
  `{ error }` result, mirroring `today-view.tsx`'s completion-toggle
  pattern. `todo-item.tsx` is the row (checkbox, title, park/un-park,
  delete — icon-only buttons get `aria-label`s). Empty state (no todos at
  all) gets encouraging copy, not "0 tasks."
- `src/components/nav/app-nav.tsx` — add `{ href: "/todos", label:
  "To-Dos", icon: <ListChecks-style icon>, matches: [] }` to `NAV_ITEMS`,
  second position.

## States to cover

Loading, empty (no todos / no parked todos), error, success, optimistic
update, and rollback after mutation failure — per CLAUDE.md's UX-states
checklist. Keyboard access and `aria-label`s on icon-only actions (park,
delete) per the accessibility checklist.
