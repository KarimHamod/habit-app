-- Which stretch of the user's day a habit belongs to. Purely an ordering /
-- grouping hint for the Today list — it never affects scheduling, streaks,
-- or completion history. Existing habits default to 'anytime', which
-- renders exactly as the list did before this column existed.
--
-- A CHECK constraint rather than a Postgres enum, matching valid_habit_type
-- and valid_frequency_type on this same table; this schema uses no
-- `create type ... as enum` anywhere.
alter table public.habits
  add column part_of_day text not null default 'anytime';

alter table public.habits
  add constraint valid_part_of_day
  check (part_of_day in ('morning', 'afternoon', 'evening', 'anytime'));
