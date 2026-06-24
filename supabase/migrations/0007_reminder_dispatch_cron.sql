-- 0007_reminder_dispatch_cron.sql
-- Phase 3: schedule reminder-dispatch once a minute (§4.5.1).
--
-- pg_cron fires every minute; pg_net makes the outbound HTTP POST to the edge
-- function. The project URL and the shared cron secret are read from Vault so no
-- secrets live in this migration. Create them once before scheduling (see
-- supabase/SETUP.md §7):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<long-random-string>',              'cron_secret');
--
-- The same '<long-random-string>' must be set as the CRON_SECRET function secret
-- so reminder-dispatch can authenticate the call.

-- Re-running this migration should not stack duplicate jobs.
select cron.unschedule('reminder-dispatch-every-min')
where exists (
  select 1 from cron.job where jobname = 'reminder-dispatch-every-min'
);

select cron.schedule(
  'reminder-dispatch-every-min',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/reminder-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 8000
    );
  $$
);
