-- habit_completions previously only checked auth.uid() = user_id, so a
-- client-supplied habit_id pointing at another user's habit could still
-- pass RLS on insert/update. Require habit_id to resolve to a habit the
-- caller actually owns, matching the pattern already used by
-- habit_schedules' policies.

drop policy "Users can insert own completions" on public.habit_completions;

create policy "Users can insert own completions"
  on public.habit_completions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits
      where habits.id = habit_completions.habit_id
      and habits.user_id = auth.uid()
    )
  );

drop policy "Users can update own completions" on public.habit_completions;

create policy "Users can update own completions"
  on public.habit_completions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits
      where habits.id = habit_completions.habit_id
      and habits.user_id = auth.uid()
    )
  );
