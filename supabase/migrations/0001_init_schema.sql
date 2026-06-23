-- 0001_init_schema.sql
-- Initial schema for the Personal Fitness & Consistency Tracker.
-- Mirrors the data model in design/fitness-pwa-tech-spec.md §4.1 / §4.2.
-- Tables are ordered so that foreign keys reference already-created tables.

-- Enums ---------------------------------------------------------------------
create type meal_type     as enum ('breakfast','lunch','dinner','snack');
create type dose_status   as enum ('taken','skipped','pending');
create type reminder_kind as enum ('medication','meal','workout_checkin','water','custom');

-- Profiles ------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  timezone      text not null default 'Asia/Kolkata',
  step_goal     int  not null default 8000,
  water_goal_ml int  not null default 3000,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Food / meals --------------------------------------------------------------
create table meal_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  meal       meal_type,
  title      text not null,
  notes      text,
  calories   int,
  use_count  int not null default 0,
  created_at timestamptz not null default now()
);

create table food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  meal        meal_type not null,
  title       text not null,
  notes       text,
  calories    int,
  photo_path  text,
  template_id uuid references meal_templates(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Workouts ------------------------------------------------------------------
create table workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text,
  exercises  jsonb,
  use_count  int not null default 0,
  created_at timestamptz not null default now()
);

create table workout_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  logged_at    timestamptz not null default now(),
  workout_day  date not null,
  type         text,
  duration_min int,
  notes        text,
  template_id  uuid references workout_templates(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table workout_exercises (
  id         uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workout_logs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  sets       int,
  reps       int,
  weight_kg  numeric(6,2),
  position   int not null default 0
);

-- Medications ---------------------------------------------------------------
create table medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  dosage     text,
  schedule   jsonb not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table medication_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  scheduled_for timestamptz not null,
  status        dose_status not null default 'pending',
  acted_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (medication_id, scheduled_for)
);

-- Steps ---------------------------------------------------------------------
create table steps_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  steps      int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Water ---------------------------------------------------------------------
create table water_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  day        date not null,
  amount_ml  int not null
);

-- Weight / body metrics -----------------------------------------------------
create table body_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  day          date not null,
  weight_kg    numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm     numeric(5,1),
  created_at   timestamptz not null default now(),
  unique (user_id, day)
);

-- Mood / energy / sleep -----------------------------------------------------
create table wellbeing_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  mood        int,
  energy      int,
  sleep_hours numeric(3,1),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, day)
);

-- Progress photos -----------------------------------------------------------
create table progress_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  taken_on   date not null,
  photo_path text not null,
  notes      text,
  created_at timestamptz not null default now()
);

-- Reminders -----------------------------------------------------------------
create table reminders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         reminder_kind not null,
  title        text not null,
  body         text,
  time_of_day  time not null,
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  deep_link    text,
  ref_id       uuid,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table reminder_dispatch_log (
  id          uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  fired_for   timestamptz not null,
  sent_at     timestamptz not null default now(),
  unique (reminder_id, fired_for)
);

-- Push subscriptions --------------------------------------------------------
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Daily check-in ------------------------------------------------------------
create table daily_checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  day          date not null,
  workout_done boolean,
  meals_logged boolean,
  meds_taken   boolean,
  steps_done   boolean,
  water_done   boolean,
  score        numeric(4,1),
  completed_at timestamptz,
  unique (user_id, day)
);

-- Weekly review -------------------------------------------------------------
create table weekly_reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary    jsonb not null,
  avg_score  numeric(4,1),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Indexes (§4.2) ------------------------------------------------------------
create index on food_logs          (user_id, logged_at desc);
create index on workout_logs       (user_id, workout_day desc);
create index on medication_logs    (user_id, scheduled_for);
create index on medication_logs    (user_id, status) where status = 'pending';
create index on steps_log          (user_id, day desc);
create index on water_log          (user_id, day);
create index on body_metrics       (user_id, day desc);
create index on reminders          (user_id, active, time_of_day);
create index on push_subscriptions (user_id);
