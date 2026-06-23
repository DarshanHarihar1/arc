# Supabase

Backend for the fitness tracker: Postgres schema, RLS, storage, and (later) Edge
Functions + cron.

## Migrations (`migrations/`)

Applied in order:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | All tables, enums, indexes, and the profile-on-signup trigger (§4.1, §4.2). |
| `0002_rls.sql` | Row Level Security own-rows policies on every user table (§4.3). |
| `0003_storage.sql` | Private `meal-photos` / `progress-photos` buckets + object RLS (§4.4). |
| `0004_extensions.sql` | `pg_cron` + `pg_net` (used from Phase 3). |

## Applying

Either apply each file in order through the Supabase SQL editor / MCP `apply_migration`,
or with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```
