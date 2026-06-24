-- 0008_daily_checkins_timestamps.sql
-- daily_checkins was created without created_at/updated_at, but the offline sync
-- engine stamps updated_at on every row for last-write-wins. Upserts to this table
-- would fail (PGRST204: 'updated_at' column not found) and stall the FIFO outbox.
-- Add the columns to match every other synced table (see 0006 for the precedent).
alter table public.daily_checkins
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
