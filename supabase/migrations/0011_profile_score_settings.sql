-- 0011_profile_score_settings.sql
-- Add per-user score configuration to profiles:
--   enabled_categories  which of the five log types count toward the score
--   green_threshold     minimum score for a "green day" (default 80)
alter table public.profiles
  add column if not exists enabled_categories jsonb not null
    default '["workout","meals","meds","steps","water"]',
  add column if not exists green_threshold int not null default 80;
