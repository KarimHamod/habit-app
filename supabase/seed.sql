-- Local development seed data.
-- Requires a local Supabase stack (`supabase start`) and a seeded auth user;
-- not run against the production/remote project.

do $$
declare
  demo_user_id uuid;
  meditation_id uuid;
  running_id uuid;
  water_id uuid;
  wellness_category_id uuid;
  fitness_category_id uuid;
begin
  select id into demo_user_id from auth.users where email = 'demo@example.com';

  if demo_user_id is null then
    raise notice 'No demo@example.com auth user found — skipping habit seed data.';
    return;
  end if;

  insert into public.categories (user_id, name, icon, color)
  values (demo_user_id, 'Wellness', 'heart', '#22c55e')
  returning id into wellness_category_id;

  insert into public.categories (user_id, name, icon, color)
  values (demo_user_id, 'Fitness', 'dumbbell', '#3b82f6')
  returning id into fitness_category_id;

  insert into public.habits (user_id, name, icon, color, category_id, type, frequency_type)
  values (demo_user_id, 'Meditate', 'brain', '#8b5cf6', wellness_category_id, 'duration', 'daily')
  returning id into meditation_id;
  insert into public.habit_schedules (habit_id, days_of_week)
  values (meditation_id, '{0,1,2,3,4,5,6}');
  update public.habits set target = 10, unit = 'minutes' where id = meditation_id;

  insert into public.habits (user_id, name, icon, color, category_id, type, frequency_type)
  values (demo_user_id, 'Run', 'footprints', '#f97316', fitness_category_id, 'duration', 'specific_days')
  returning id into running_id;
  insert into public.habit_schedules (habit_id, days_of_week)
  values (running_id, '{1,3,5}');
  update public.habits set target = 30, unit = 'minutes' where id = running_id;

  insert into public.habits (user_id, name, icon, color, category_id, type, frequency_type)
  values (demo_user_id, 'Drink Water', 'glass-water', '#06b6d4', wellness_category_id, 'quantity', 'daily')
  returning id into water_id;
  insert into public.habit_schedules (habit_id, days_of_week)
  values (water_id, '{0,1,2,3,4,5,6}');
  update public.habits set target = 8, unit = 'glasses' where id = water_id;

  insert into public.habit_completions (habit_id, user_id, date, value, completed)
  values
    (meditation_id, demo_user_id, current_date, 10, true),
    (meditation_id, demo_user_id, current_date - 1, 10, true),
    (water_id, demo_user_id, current_date, 6, false);
end $$;
