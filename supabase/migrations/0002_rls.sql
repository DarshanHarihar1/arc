-- 0002_rls.sql
-- Row Level Security: each user can only touch their own rows (§4.3).
-- The identical four-policy own-rows pattern is applied to every user-owned
-- table keyed on user_id; profiles is keyed on its id.

do $$
declare t text;
begin
  foreach t in array array[
    'meal_templates','food_logs','workout_templates','workout_logs',
    'workout_exercises','medications','medication_logs','steps_log',
    'water_log','body_metrics','wellbeing_log','progress_photos',
    'reminders','reminder_dispatch_log','push_subscriptions',
    'daily_checkins','weekly_reviews'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows - select" on %I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows - insert" on %I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows - update" on %I for update using (auth.uid() = user_id)', t);
    execute format('create policy "own rows - delete" on %I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- profiles: keyed on id (= auth.users.id)
alter table profiles enable row level security;
create policy "own profile - select" on profiles for select using (auth.uid() = id);
create policy "own profile - insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile - update" on profiles for update using (auth.uid() = id);
create policy "own profile - delete" on profiles for delete using (auth.uid() = id);
