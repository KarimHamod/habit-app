-- Minimal personal to-do list, deliberately separate from the habit
-- system: title, a completion timestamp, and a "parked for later" flag.
-- No tags/time-estimate/subtasks — see docs/superpowers/specs/2026-09-15-todo-list-design.md.

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

create policy "Users can view own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own todos"
  on public.todos for delete
  using (auth.uid() = user_id);
