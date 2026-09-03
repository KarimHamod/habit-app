create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  value numeric,
  completed boolean not null default true,
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);

create trigger set_habit_completions_updated_at
  before update on public.habit_completions
  for each row
  execute function public.set_updated_at();

create index completions_user_id_date_idx on public.habit_completions(user_id, date);
create index completions_habit_id_date_idx on public.habit_completions(habit_id, date);

alter table public.habit_completions enable row level security;

create policy "Users can view own completions"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own completions"
  on public.habit_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.habit_completions for delete
  using (auth.uid() = user_id);
