-- 0006_workout_exercises_timestamps.sql
-- workout_exercises was created without created_at/updated_at, but the offline
-- sync engine stamps updated_at on every row for last-write-wins. Upserts to this
-- table therefore failed (PGRST204: 'updated_at' column not found), which stalled
-- the FIFO outbox. Add the columns to match every other synced table.
alter table public.workout_exercises
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
