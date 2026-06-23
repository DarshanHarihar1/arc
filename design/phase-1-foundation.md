# Phase 1 — Foundation

**Goal:** Stand up the backend and an installable PWA shell so that an authenticated
user can sign in on their iPhone and add the app to their home screen. No feature
logging yet — this phase proves the platform end to end.

Spec references: §3.1 (architecture), §3.3 (tech stack), §4.1 (data model), §4.3 (RLS),
§4.4 (storage), §4.8 (PWA config), §5.1.

## Scope

### Backend (Supabase)
- Create the Supabase project (free tier).
- Apply the **full schema** from §4.1 as the initial migration (all tables, enums, and
  the `gen_random_uuid` defaults). Creating the whole schema up front avoids repeated
  migrations; later phases only add data flows, not tables.
- Add the indexes from §4.2.
- Enable **Row Level Security** on every user-owned table and apply the four-policy
  own-rows pattern from §4.3 (select/insert/update/delete keyed on `auth.uid() = user_id`,
  and on `id` for `profiles`).
- Create the two private Storage buckets `meal-photos` and `progress-photos` with the
  folder-prefix RLS from §4.4.
- Enable the `pg_cron` and `pg_net` extensions (used in Phase 3; enabling now keeps the
  foundation migration self-contained).
- A `profiles` row is created on first sign-in (trigger on `auth.users` or client upsert).

### Auth
- Supabase Auth with **magic-link / OTP** sign-in.
- Session handling via `supabase-js`; session persisted to secure storage.
- Route guard that redirects unauthenticated users to `/onboarding`.

### Frontend (PWA shell)
- React 18 + TypeScript + Vite project scaffold.
- `vite-plugin-pwa` configured: Workbox service worker (precache app shell only for now)
  + Web App Manifest (`display: standalone`, name, theme/background colors, maskable
  192/512 icons, `start_url: '/'`, `scope: '/'`).
- iOS specifics: `apple-touch-icon`, viewport meta, standalone display.
- Tailwind CSS + shadcn/ui installed and themed.
- App-shell routing skeleton for the screens in §4.7.1 (placeholder pages are fine):
  `/`, `/onboarding`, `/settings`, and stubs for the log routes.
- A minimal `/onboarding` page that explains "Add to Home Screen" and detects
  `display-mode: standalone`.
- Deploy to free static hosting (Cloudflare Pages or Vercel) over HTTPS.

## Out of Scope
- Any actual logging UI or data writes (Phase 2).
- Dexie / offline outbox (Phase 2).
- Push subscription and notifications (Phase 3).

## Acceptance Criteria
- A new user can request a magic link, sign in, and land on the dashboard placeholder.
- An unauthenticated visit redirects to `/onboarding`.
- The app is served over HTTPS and can be installed to the iPhone home screen; it opens
  standalone (no Safari chrome).
- A signed-in user has exactly one `profiles` row.
- Running the RLS policies, a user cannot read another user's rows (verified with two
  test accounts).
- Lighthouse PWA "installable" check passes.

## Verifiable Goals
1. Schema migration applies cleanly to a fresh database → verify: `list_tables` shows all
   spec tables; `get_advisors` reports no RLS-disabled user tables.
2. Auth round-trip → verify: magic-link sign-in yields a session and a `profiles` row.
3. Cross-user isolation → verify: an integration test with two JWTs confirms each can
   only select its own rows.
4. Installability → verify: manifest + service worker present; Lighthouse installable
   audit passes.
