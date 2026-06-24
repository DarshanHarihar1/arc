# Supabase Setup

Exact steps to stand up the backend for Arc. Phase 1/2 need everything in sections
1–5. Section 7 (push) is only needed when we reach Phase 3.

## 0. What you need (checklist)

- A Supabase account (free tier is enough).
- One Supabase **project** (Postgres 15 + Auth + Storage).
- Extensions `pg_cron` + `pg_net` enabled (migration `0004` does this; verify in the dashboard).
- Auth **Email** provider enabled (magic link / OTP) with the app URLs allow-listed.
- The project **URL** + **anon (publishable) key** copied into the frontend `.env`.
- Later (Phase 3 only): VAPID keypair, service-role key, and a cron secret stored as secrets.

## 1. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. **Organization:** pick or create one.
3. **Name:** `arc` (anything).
4. **Database password:** generate a strong one and save it (needed for the CLI / direct DB access).
5. **Region:** choose the one closest to you — for India, **South Asia (Mumbai) `ap-south-1`**.
6. **Plan:** Free.
7. Create, then wait ~2 minutes for provisioning.

## 2. Get the API credentials

Project → **Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **`anon` `public` key** → `VITE_SUPABASE_ANON_KEY`

Put them in the frontend env:

```bash
cp .env.example .env
# edit .env:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon public key>
```

## 3. Configure Auth (magic link)

Project → **Authentication**:

1. **Providers → Email:** enabled. Magic-link / OTP sign-in is on by default.
2. **URL Configuration:**
   - **Site URL:** your primary app URL (prod hosting URL once deployed, e.g. `https://arc.pages.dev`).
   - **Redirect URLs:** add every origin the app runs on, e.g.
     - `http://localhost:5173`
     - your deployed URL
   The client signs in with `emailRedirectTo: window.location.origin`, so each origin must be allow-listed or the magic link will be rejected.

## 4. Apply the migrations

Apply [`migrations/`](./migrations) **in order** (`0001` → `0004`). Pick one:

**Option A — MCP (I run it).** Once you grant the Supabase MCP approval (section 6),
I apply each file via `apply_migration` and then run `get_advisors` to confirm RLS.

**Option B — SQL editor.** Project → **SQL Editor** → paste the contents of each file
in order and run.

**Option C — CLI.**
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## 5. Verify extensions & RLS

- Project → **Database → Extensions:** confirm `pg_cron` and `pg_net` are enabled
  (migration `0004` enables them; if your project blocks `create extension`, toggle them on here).
- Project → **Advisors → Security** (or MCP `get_advisors`): no "RLS disabled" findings on
  any user table.

## 6. Let me run migrations via MCP (optional)

The Supabase MCP tool calls in this session are currently auto-rejected with
"requires approval". To let me create the project / run migrations directly:

- Grant/approve the **Supabase MCP server** for this Claude Code session (the connector
  approval in the web app's tool/permission settings).
- Once approved, tell me — I'll list your orgs, create the project (or target an existing
  one), apply `0001`–`0004`, and run the advisor check, flagging anything that needs a
  confirmation step (e.g. project-creation cost confirmation).

If you'd rather not, just do sections 1–5 yourself and paste me the project URL + anon key.

## 7. Push & reminders (Phase 3)

This wires the reminder pipeline: client subscribe → `push-subscribe` →
`push_subscriptions`, and `pg_cron` (1/min) → `reminder-dispatch` → Web Push.

### 7.1 Generate a VAPID keypair

```bash
npx web-push generate-vapid-keys
```

Keep both keys. The **public** key is safe to ship to the client; the **private**
key is a server secret — never commit it or put it in the frontend `.env`.

- **Public key** → frontend env `VITE_VAPID_PUBLIC_KEY` (in `.env`, rebuild the app).

### 7.2 Set Edge Function secrets

Pick a long random `CRON_SECRET` (e.g. `openssl rand -hex 32`). Then either via the
CLI or the dashboard (**Edge Functions → Secrets**):

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<public>  VAPID_PRIVATE_KEY=<private> \
  VAPID_SUBJECT=mailto:you@example.com \
  CRON_SECRET=<random>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — you don't set those.

### 7.3 Deploy the Edge Functions

```bash
supabase functions deploy push-subscribe
supabase functions deploy reminder-dispatch
```

`supabase/config.toml` sets `verify_jwt = true` for `push-subscribe` (browser calls
it with the user JWT) and `false` for `reminder-dispatch` (cron calls it with the
`CRON_SECRET` bearer, which the function checks itself).

### 7.4 Store the cron secrets in Vault & schedule

Migration `0007` reads the project URL and cron secret from Vault. Create them once
(**Database → SQL Editor**), using the **same** `CRON_SECRET` from 7.2:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<same CRON_SECRET>',                 'cron_secret');
```

Then apply migration `0007_reminder_dispatch_cron.sql` (MCP / SQL editor / `db push`)
to schedule the every-minute job. Verify with `select * from cron.job;`.

### 7.5 Test end-to-end

- Open the installed PWA, go to **Settings → Reminders → Enable reminders**, grant
  permission (on iPhone this only works from the home-screen install, iOS 16.4+).
  Confirm a row lands in `push_subscriptions`.
- Add a reminder a minute or two out. Within the next minute the device should get a
  notification; tapping it deep-links into the app.
- Idempotency: invoking `reminder-dispatch` twice in the same minute inserts one
  `reminder_dispatch_log` row and sends one push.
