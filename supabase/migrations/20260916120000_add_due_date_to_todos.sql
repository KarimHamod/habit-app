-- Optional due date/time on a to-do. due_time is only meaningful paired
-- with due_date — a time with no date has nothing to be "due" on.

alter table public.todos
  add column due_date date,
  add column due_time time,
  add constraint todo_due_time_requires_date
    check (due_time is null or due_date is not null);

create index todos_due_date_idx on public.todos(user_id, due_date);
