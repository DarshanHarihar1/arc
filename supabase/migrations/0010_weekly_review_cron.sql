-- 0010_weekly_review_cron.sql
-- Schedule the weekly-review edge function every Sunday at 17:30 UTC,
-- which is 23:00 IST — late enough that most users' Sundays are complete.
-- The function handles per-user timezone logic internally.
select cron.schedule(
  'weekly-review',
  '30 17 * * 0',
  $$
  select net.http_post(
    url    := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/weekly-review',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET')
    ),
    body   := '{}'::jsonb
  )
  $$
);
