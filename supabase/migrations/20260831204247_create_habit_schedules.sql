create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  days_of_week smallint[],
  times_per_period integer,
  reminder_enabled boolean not null default false,
  reminder_time time,
  created_at timestamptz not null default now(),
  unique (habit_id),
  constraint valid_days_of_week
    check (days_of_week is null or days_of_week <@ '{0,1,2,3,4,5,6}'::smallint[]),
  constraint valid_times_per_period
    check (times_per_period is null or times_per_period > 0)
);

create index habit_schedules_habit_id_idx on public.habit_schedules(habit_id);

alter table public.habit_schedules enable row level security;

create policy "Users can view own habit schedules"
  on public.habit_schedules for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can insert own habit schedules"
  on public.habit_schedules for insert
  with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can update own habit schedules"
  on public.habit_schedules for update
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
      and habits.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can delete own habit schedules"
  on public.habit_schedules for delete
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedules.habit_id
      and habits.user_id = auth.uid()
    )
  );
