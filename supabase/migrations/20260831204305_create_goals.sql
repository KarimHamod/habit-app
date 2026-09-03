create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  type text not null,
  target numeric not null,
  period text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint valid_goal_date_range check (end_date >= start_date)
);

create index goals_user_id_idx on public.goals(user_id);
create index goals_habit_id_idx on public.goals(habit_id);

alter table public.goals enable row level security;

create policy "Users can view own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
