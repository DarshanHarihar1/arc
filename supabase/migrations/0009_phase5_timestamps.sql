-- 0009_phase5_timestamps.sql
-- water_log, body_metrics, and wellbeing_log were created without updated_at,
-- but the offline sync engine stamps updated_at on every row for last-write-wins.
-- Upserts to these tables would fail (PGRST204) and stall the FIFO outbox.
-- Add the column to each table (see 0006 and 0008 for the same fix on other tables).
alter table public.water_log
  add column if not exists updated_at timestamptz not null default now();

alter table public.body_metrics
  add column if not exists updated_at timestamptz not null default now();

alter table public.wellbeing_log
  add column if not exists updated_at timestamptz not null default now();
