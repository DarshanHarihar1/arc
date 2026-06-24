-- 0012_cleanup_subscriptions_cron.sql
-- Daily job at 03:00 UTC to test-ping every push subscription and prune
-- any that respond with a 404 or 410 (revoked / expired).
select cron.schedule(
  'cleanup-subscriptions',
  '0 3 * * *',
  $$
  select net.http_post(
    url    := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/cleanup-subscriptions',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET')
    ),
    body   := '{}'::jsonb
  )
  $$
);
