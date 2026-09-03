create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  color text,
  category_id uuid references public.categories(id) on delete set null,
  type text not null,
  target numeric,
  unit text,
  frequency_type text not null,
  start_date date not null default current_date,
  end_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_habit_type
    check (type in ('boolean', 'quantity', 'duration')),
  constraint valid_frequency_type
    check (
      frequency_type in (
        'daily',
        'weekly',
        'specific_days',
        'custom'
      )
    ),
  constraint valid_date_range
    check (end_date is null or end_date >= start_date)
);

create trigger set_habits_updated_at
  before update on public.habits
  for each row
  execute function public.set_updated_at();

create index habits_user_id_idx on public.habits(user_id);
create index habits_category_id_idx on public.habits(category_id);

alter table public.habits enable row level security;

create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);
