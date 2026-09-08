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
