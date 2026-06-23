-- 0004_extensions.sql
-- Enable the scheduling extensions used by the reminder pipeline (§3.1, §4.5).
-- They are not exercised until Phase 3, but enabling them here keeps the
-- foundation migration self-contained.

create extension if not exists pg_cron;
create extension if not exists pg_net;
