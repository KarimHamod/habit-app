-- One optional free-text reflection per habit-day.
--
-- entry_date is the user's own calendar day, resolved in their configured
-- timezone by the caller — deliberately no `default current_date`, which
-- would be the server's UTC day and could file a reflection under the wrong
-- day near midnight.
--
-- Nothing here derives from or feeds back into habit completion history:
-- the journal has no streak, no score, and no effect on habit logic.
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

-- The unique (user_id, entry_date) constraint already provides the index the
-- history list needs; Postgres scans it backwards for `order by entry_date
-- desc`, so no separate index is added.

alter table public.reflections enable row level security;

create policy "Users can view own reflections"
  on public.reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert own reflections"
  on public.reflections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reflections"
  on public.reflections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own reflections"
  on public.reflections for delete
  using (auth.uid() = user_id);

create trigger reflections_set_updated_at
  before update on public.reflections
  for each row
  execute function public.set_updated_at();
