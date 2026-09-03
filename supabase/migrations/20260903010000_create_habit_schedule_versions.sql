-- habits.frequency_type / habit_schedules.days_of_week / times_per_period
-- were being overwritten in place on every edit, so streak and completion-
-- rate math (which walks the full completion history) silently re-evaluated
-- past dates under whatever schedule is current today. This table records
-- each schedule as it actually applied over time; `habits` and
-- `habit_schedules` keep holding "current" values (unchanged) for display
-- and form defaults, while historical calculations resolve the version that
-- was actually in effect on each date.

create table public.habit_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  frequency_type text not null,
  days_of_week smallint[],
  times_per_period integer,
  effective_from date not null,
  -- null = still the current version
  effective_until date,
  created_at timestamptz not null default now(),
  constraint valid_frequency_type
    check (
      frequency_type in ('daily', 'weekly', 'specific_days', 'custom')
    ),
  constraint valid_days_of_week
    check (days_of_week is null or days_of_week <@ '{0,1,2,3,4,5,6}'::smallint[]),
  constraint valid_times_per_period
    check (times_per_period is null or times_per_period > 0),
  constraint valid_effective_range
    check (effective_until is null or effective_until >= effective_from)
);

create index habit_schedule_versions_habit_id_idx
  on public.habit_schedule_versions(habit_id);

-- Only one open-ended (current) version per habit at a time.
create unique index habit_schedule_versions_current_idx
  on public.habit_schedule_versions(habit_id)
  where effective_until is null;

alter table public.habit_schedule_versions enable row level security;

create policy "Users can view own schedule versions"
  on public.habit_schedule_versions for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedule_versions.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can insert own schedule versions"
  on public.habit_schedule_versions for insert
  with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedule_versions.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can update own schedule versions"
  on public.habit_schedule_versions for update
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedule_versions.habit_id
      and habits.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedule_versions.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can delete own schedule versions"
  on public.habit_schedule_versions for delete
  using (
    exists (
      select 1 from public.habits
      where habits.id = habit_schedule_versions.habit_id
      and habits.user_id = auth.uid()
    )
  );

-- Backfill: every existing habit gets one open-ended version reflecting
-- its current schedule, effective since its own start date.
insert into public.habit_schedule_versions
  (habit_id, frequency_type, days_of_week, times_per_period, effective_from, effective_until)
select
  h.id,
  h.frequency_type,
  s.days_of_week,
  s.times_per_period,
  h.start_date,
  null
from public.habits h
left join public.habit_schedules s on s.habit_id = h.id;
