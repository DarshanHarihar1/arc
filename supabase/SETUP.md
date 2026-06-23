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

## 7. Push (Phase 3 — not needed yet)

When we build reminders:

- Generate a **VAPID** keypair; store the **private** key as an Edge Function secret,
  ship the **public** key to the client (`VITE_VAPID_PUBLIC_KEY`).
- Store the **service-role key** and a **cron secret** as Edge Function / DB secrets
  (never in the frontend).
- Deploy the Edge Functions and schedule the `pg_cron` job.
