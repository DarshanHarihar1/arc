# Personal Fitness & Consistency Tracker — Technical Specification

**Document type:** High-Level Design (HLD) + Low-Level Design (LLD)
**Platform:** Installable Progressive Web App (PWA), iOS-first
**Status:** Draft v1.0
**Owner:** Personal project (single user now, multi-user ready)

---

## 1. Overview

### 1.1 Purpose
A personal, installable web app whose single job is to make the user **consistent** with workouts, food, medicines, steps, and related health habits. It does this by making logging frictionless, reminding the user actively, and turning adherence into visible streaks and a daily consistency score.

### 1.2 Goals
- Log every **meal**, **workout**, **medicine dose**, and **step count** quickly (target: a few taps per entry).
- Send **active reminders** (medicines, meals, end-of-day workout check-in) even when the app is closed.
- Provide a single evening **daily check-in** that closes out the whole day in ~30 seconds.
- Surface **streaks** and a **daily consistency score** as the primary motivator.
- Work **offline** and feel instant.
- Be installable on iPhone **without the App Store** (no Apple Developer fee, no review).
- Cost effectively **$0** to run at personal scale.
- Be **multi-user ready** so others can be invited later without a rebuild.

### 1.3 Non-Goals
- No native iOS/Android app (no App Store distribution).
- No integration with Mi Band 10 / Apple Health / Apple Watch. (No official Mi Band API exists; Web Bluetooth is unsupported on iOS. Steps and similar are entered manually.)
- No automatic step counting from device sensors (treated as manual entry).
- No data export/backup feature in this version (explicitly out of scope for v1).
- No social feed, gamified competition, or coaching/AI plan generation in v1.

### 1.4 Key Constraints & Decisions
| Constraint | Decision |
|---|---|
| iOS PWAs cannot read Apple Health / use Web Bluetooth | All device-sourced metrics (steps, weight) are **manual entry** |
| iOS PWAs can only receive push if **installed to home screen** (iOS 16.4+) | Onboarding must guide "Add to Home Screen" + grant notification permission |
| A closed web app cannot self-schedule notifications | Reminders are driven by a **server-side scheduler** (Supabase `pg_cron` + Edge Function + Web Push) |
| Gym/poor connectivity during logging | **Offline-first**: write locally to IndexedDB, sync to server when online |
| Solo now, shared later | Auth + Row Level Security from day one |

---

## 2. Feature Scope

All features below are **in scope for v1**.

**Core (originally requested):**
1. Food/meal logging (every meal).
2. Workout logging + end-of-day "what did you train?" prompt.
3. Medicine reminders + dose logging (taken/skipped).
4. Step count (daily manual entry).
5. Active reminders for medicines, meals, and the workout check-in.

**Additions (all included except Export/backup):**
6. Evening **daily check-in** screen (workout? meals? meds? steps? water? in one flow).
7. **Streaks** + **daily consistency score**.
8. **Quick-log templates** (favorite meals, usual gym splits).
9. **Weight / body-metric** tracking with trend line.
10. **Water intake** logging.
11. **Mood / energy / sleep** quick logs.
12. **Progress photos** (weekly).
13. **Weekly review** summary.

---

## 3. High-Level Design (HLD)

### 3.1 System Architecture

```
┌──────────────────────────────────────────────────────────┐
│  iPhone — PWA installed to Home Screen                    │
│                                                          │
│  ┌────────────────────┐      ┌────────────────────────┐  │
│  │  React UI (SPA)     │      │  Service Worker         │  │
│  │  - log screens      │      │  - offline asset cache  │  │
│  │  - dashboard/charts │◄────►│  - push event receiver  │  │
│  │  - daily check-in   │      │  - shows notifications  │  │
│  └─────────┬──────────┘      └───────────┬────────────┘  │
│            │                              │ (web push)    │
│  ┌─────────▼──────────┐                   │               │
│  │ Dexie / IndexedDB  │                   │               │
│  │ - local cache      │                   │               │
│  │ - write/sync queue │                   │               │
│  └─────────┬──────────┘                   │               │
└────────────┼──────────────────────────────┼───────────────┘
             │ HTTPS (REST / supabase-js)    │ push delivery
             ▼                               ▲
┌──────────────────────────────────────────────────────────┐
│                        SUPABASE                           │
│                                                          │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Auth      │  │  Postgres + RLS  │  │  Storage     │  │
│  │ magic link │  │  all log tables  │  │ meal/progress│  │
│  └────────────┘  └────────┬─────────┘  │   photos     │  │
│                           │            └──────────────┘  │
│  ┌────────────────────────▼──────────────────────────┐   │
│  │  pg_cron (every minute) ──▶ pg_net HTTP POST ──┐   │   │
│  └────────────────────────────────────────────────┼──┘   │
│                                                    ▼      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Edge Function: reminder-dispatch (Deno)              │ │
│  │  - query reminders due now                           │ │
│  │  - send Web Push (VAPID) to user's subscriptions     │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Edge Function: push-subscribe / weekly-review        │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
        │ static hosting
        ▼
┌──────────────────────────────────────┐
│  Cloudflare Pages / Vercel (free)    │
│  serves the built PWA bundle         │
└──────────────────────────────────────┘
```

### 3.2 Components

| Component | Responsibility |
|---|---|
| **React SPA** | All UI: logging, dashboard, check-in, settings. |
| **Service Worker** | Offline asset caching; receives `push` events; renders notifications; handles `notificationclick`. |
| **Dexie (IndexedDB)** | Local-first store + outbox/sync queue so logging works offline and feels instant. |
| **Supabase Auth** | Identity (magic-link). Issues JWT used by all data calls. |
| **Postgres + RLS** | Source of truth for all logs. RLS isolates each user's rows. |
| **Supabase Storage** | Binary blobs: meal photos, progress photos. RLS-protected buckets. |
| **`pg_cron`** | Time trigger — runs the dispatcher check on a fixed cadence. |
| **`pg_net`** | Lets a SQL cron job make an outbound HTTP call to an Edge Function. |
| **Edge Function `reminder-dispatch`** | Finds due reminders, sends Web Push. |
| **Edge Function `push-subscribe`** | Stores a device's push subscription. |
| **Edge Function `weekly-review`** | Generates the weekly summary + optional Sunday push. |
| **Static host** | Serves the compiled PWA over HTTPS (PWA requires HTTPS). |

### 3.3 Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite + `vite-plugin-pwa` (Workbox-based service worker + manifest)
- Tailwind CSS + shadcn/ui
- TanStack Query (server state / caching)
- Dexie.js (IndexedDB wrapper, offline queue)
- Recharts (charts)
- `date-fns` (date math; timezone-aware day boundaries)
- `@supabase/supabase-js` (data, auth, storage client)

**Backend (Supabase)**
- Postgres 15 with Row Level Security
- Supabase Auth (magic link / OTP)
- Supabase Storage (2 buckets: `meal-photos`, `progress-photos`)
- Edge Functions (Deno runtime, TypeScript)
- Extensions: `pg_cron`, `pg_net`

**Push & Hosting**
- Web Push Protocol with VAPID keys
- Cloudflare Pages or Vercel (free static hosting)
- Supabase free tier

### 3.4 Core Data Flows

**A. Logging (offline-first)**
1. User taps to log (e.g. a meal).
2. Write goes to Dexie immediately → UI updates instantly (optimistic).
3. Entry is added to a local **sync outbox**.
4. When online, a background sync flushes the outbox to Postgres via `supabase-js`.
5. Photos upload to Storage; the returned path is stored on the row.
6. Conflicts are rare (single-user-per-row); **last-write-wins** by `updated_at`.

**B. Reminders (server-driven push)**
1. `pg_cron` runs every minute.
2. The cron job calls `pg_net.http_post(...)` to invoke `reminder-dispatch`.
3. The function computes "now" per user timezone, finds reminders due in this minute (and any missed within a grace window), de-duplicates against already-sent log.
4. For each due reminder, it loads the user's `push_subscriptions` and sends a Web Push payload (title, body, deep-link URL, tag).
5. The device's service worker receives the `push` event and shows the notification.
6. Tapping opens the app at the relevant log screen (`notificationclick` → `clients.openWindow`).

**C. Dashboard / consistency**
1. UI queries today's + recent logs (from Dexie cache, revalidated against Postgres).
2. Client computes **daily score**, **streaks**, and chart series.
3. Renders dashboard, streak counters, and trend charts.

**D. Weekly review**
1. `pg_cron` triggers `weekly-review` on Sunday evening (per-user TZ).
2. Function aggregates the past 7 days and stores a `weekly_reviews` row.
3. Optional push: "Your week is ready."

### 3.5 Offline & Sync Strategy
- **Read path:** TanStack Query backed by Dexie; show cached data instantly, revalidate from server.
- **Write path:** all writes go to Dexie + outbox first; never block the UI on the network.
- **Flush triggers:** app foreground, `online` event, periodic timer, post-login.
- **Idempotency:** each record carries a client-generated UUID (`id`) so re-sending is safe (upsert on PK).
- **Conflict policy:** last-write-wins via `updated_at`; acceptable because rows are single-user-owned.

---

## 4. Low-Level Design (LLD)

### 4.1 Data Model (Postgres)

Conventions: every user-owned table has `id uuid pk`, `user_id uuid` (FK → `auth.users`), `created_at`, `updated_at`. Timestamps are `timestamptz`. A "logical day" is derived in the user's timezone (`profiles.timezone`).

```sql
-- 4.1.1 Profiles -----------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone     text not null default 'Asia/Kolkata',
  step_goal    int  not null default 8000,
  water_goal_ml int not null default 3000,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 4.1.2 Food / meals -------------------------------------------------------
create type meal_type as enum ('breakfast','lunch','dinner','snack');

create table food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  meal        meal_type not null,
  title       text not null,
  notes       text,
  calories    int,            -- optional
  photo_path  text,           -- Storage path, nullable
  template_id uuid references meal_templates(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table meal_templates (   -- quick-log "favorite meals"
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  meal       meal_type,
  title      text not null,
  notes      text,
  calories   int,
  use_count  int not null default 0,   -- to sort by most-used
  created_at timestamptz not null default now()
);

-- 4.1.3 Workouts -----------------------------------------------------------
create table workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  workout_day date not null,             -- the logical day it counts for
  type        text,                      -- 'push','pull','legs','cardio',...
  duration_min int,
  notes       text,
  template_id uuid references workout_templates(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table workout_exercises (         -- child rows of a workout
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references workout_logs(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  sets          int,
  reps          int,
  weight_kg     numeric(6,2),
  position      int not null default 0
);

create table workout_templates (         -- usual gym splits
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,              -- 'Push Day A'
  type       text,
  exercises  jsonb,                      -- prefilled list
  use_count  int not null default 0,
  created_at timestamptz not null default now()
);

-- 4.1.4 Medications --------------------------------------------------------
create table medications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  dosage      text,                      -- '500mg', '1 tablet'
  schedule    jsonb not null,            -- e.g. [{"time":"09:00"},{"time":"21:00"}]
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type dose_status as enum ('taken','skipped','pending');

create table medication_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  scheduled_for timestamptz not null,    -- the specific dose instance
  status        dose_status not null default 'pending',
  acted_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (medication_id, scheduled_for)  -- one row per dose instance
);

-- 4.1.5 Steps --------------------------------------------------------------
create table steps_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  steps      int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)                  -- one entry per day (upsert)
);

-- 4.1.6 Water --------------------------------------------------------------
create table water_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  day        date not null,
  amount_ml  int not null
);

-- 4.1.7 Weight / body metrics ---------------------------------------------
create table body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  weight_kg   numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm    numeric(5,1),
  created_at  timestamptz not null default now(),
  unique (user_id, day)
);

-- 4.1.8 Mood / energy / sleep ---------------------------------------------
create table wellbeing_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  mood        int,            -- 1..5
  energy      int,            -- 1..5
  sleep_hours numeric(3,1),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, day)
);

-- 4.1.9 Progress photos ----------------------------------------------------
create table progress_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  taken_on   date not null,
  photo_path text not null,   -- Storage path
  notes      text,
  created_at timestamptz not null default now()
);

-- 4.1.10 Reminders ---------------------------------------------------------
create type reminder_kind as enum
  ('medication','meal','workout_checkin','water','custom');

create table reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          reminder_kind not null,
  title         text not null,
  body          text,
  time_of_day   time not null,          -- local time in user's TZ
  days_of_week  int[] not null default '{0,1,2,3,4,5,6}', -- 0=Sun
  deep_link     text,                   -- e.g. '/log/medicine'
  ref_id        uuid,                   -- optional link (e.g. medication.id)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table reminder_dispatch_log (    -- de-dupe + audit of sends
  id           uuid primary key default gen_random_uuid(),
  reminder_id  uuid not null references reminders(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  fired_for    timestamptz not null,    -- the intended fire instant
  sent_at      timestamptz not null default now(),
  unique (reminder_id, fired_for)
);

-- 4.1.11 Push subscriptions ------------------------------------------------
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- 4.1.12 Daily check-in ----------------------------------------------------
create table daily_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  workout_done  boolean,
  meals_logged  boolean,
  meds_taken    boolean,
  steps_done    boolean,
  water_done    boolean,
  score         numeric(4,1),    -- cached consistency score 0..100
  completed_at  timestamptz,
  unique (user_id, day)
);

-- 4.1.13 Weekly review -----------------------------------------------------
create table weekly_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  week_start    date not null,           -- Monday
  summary       jsonb not null,          -- aggregates + computed insights
  avg_score     numeric(4,1),
  created_at    timestamptz not null default now(),
  unique (user_id, week_start)
);
```

### 4.2 Indexes
```sql
create index on food_logs        (user_id, logged_at desc);
create index on workout_logs     (user_id, workout_day desc);
create index on medication_logs  (user_id, scheduled_for);
create index on medication_logs  (user_id, status) where status = 'pending';
create index on steps_log        (user_id, day desc);
create index on water_log        (user_id, day);
create index on body_metrics     (user_id, day desc);
create index on reminders        (user_id, active, time_of_day);
create index on push_subscriptions (user_id);
```

### 4.3 Row Level Security (applies to every user-owned table)
```sql
alter table food_logs enable row level security;

create policy "own rows - select"
  on food_logs for select using (auth.uid() = user_id);
create policy "own rows - insert"
  on food_logs for insert with check (auth.uid() = user_id);
create policy "own rows - update"
  on food_logs for update using (auth.uid() = user_id);
create policy "own rows - delete"
  on food_logs for delete using (auth.uid() = user_id);
```
The identical four-policy pattern is applied to: `meal_templates`, `workout_logs`, `workout_exercises`, `workout_templates`, `medications`, `medication_logs`, `steps_log`, `water_log`, `body_metrics`, `wellbeing_log`, `progress_photos`, `reminders`, `reminder_dispatch_log`, `push_subscriptions`, `daily_checkins`, `weekly_reviews`, and `profiles` (keyed on `id`). Service-role calls (Edge Functions) bypass RLS and must filter by `user_id` explicitly.

### 4.4 Storage Buckets
- `meal-photos` (private) — path convention `{user_id}/{food_log_id}.jpg`.
- `progress-photos` (private) — path convention `{user_id}/{yyyy-mm-dd}.jpg`.
- Access via signed URLs generated per request; Storage RLS restricts objects to `auth.uid() = (storage.foldername(name))[1]::uuid`.
- Client compresses images (e.g. to ≤1080px, ~70% quality) before upload to save space/bandwidth.

### 4.5 Reminder Pipeline (detailed)

**4.5.1 Cron**
```sql
-- runs every minute; pg_net posts to the edge function
select cron.schedule(
  'reminder-dispatch-every-min',
  '* * * * *',
  $$
    select net.http_post(
      url     := 'https://<project-ref>.supabase.co/functions/v1/reminder-dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.cron_secret')),
      body    := '{}'::jsonb
    );
  $$
);
```

**4.5.2 `reminder-dispatch` (Deno) — logic**
```
on invoke:
  now_utc = Date.now()
  for each active reminder R (join profiles for timezone):
     local_now   = now in R.user timezone
     if local_now.weekday not in R.days_of_week: continue
     fire_instant = today @ R.time_of_day in user TZ
     # grace window catches minor cron drift / cold starts
     if abs(local_now - fire_instant) > GRACE (e.g. 90s): continue
     if exists reminder_dispatch_log(R.id, fire_instant): continue   # de-dupe
     subs = push_subscriptions where user_id = R.user_id
     for s in subs:
        sendWebPush(s, {title:R.title, body:R.body, url:R.deep_link, tag:R.kind})
        on 404/410: delete that subscription (expired)
     insert reminder_dispatch_log(R.id, R.user_id, fire_instant)
```
- **Idempotency:** the unique `(reminder_id, fired_for)` row prevents duplicate sends even if cron double-fires.
- **VAPID:** private key stored as an Edge Function secret; public key shipped to the client for subscription.
- **Medication specifics:** a medication reminder also ensures a `medication_logs` row exists in `pending` for that dose, so the deep-linked screen can show a one-tap Taken/Skipped.

**4.5.3 Client subscription flow**
```
1. User installs PWA to home screen (required on iOS for push).
2. In a user-gesture handler (button tap), call Notification.requestPermission().
3. If granted: registration.pushManager.subscribe({ userVisibleOnly:true,
      applicationServerKey: <VAPID public> })
4. POST the subscription to edge fn 'push-subscribe' -> store in push_subscriptions.
```

**4.5.4 Service worker push handlers**
```js
self.addEventListener('push', (e) => {
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, data: { url: d.url }, badge: '/badge.png'
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
```

### 4.6 Consistency Score & Streaks

**4.6.1 Daily score (0–100)**
Each enabled category contributes a weighted component for the day. Defaults (configurable):

| Category | Condition for "complete" | Weight |
|---|---|---|
| Workout | ≥1 `workout_logs` row for the day | 30 |
| Meals | meals logged ≥ user's expected count (default 3) | 25 |
| Medicines | all scheduled doses `taken` | 25 |
| Steps | `steps_log.steps ≥ profiles.step_goal` | 10 |
| Water | sum(`water_log.amount_ml`) ≥ `water_goal_ml` | 10 |

```
score(day) = Σ (weight_i × complete_i) / Σ (weight_i for enabled categories) × 100
```
A day is a **"green day"** if `score ≥ 80` (threshold configurable).

**4.6.2 Streak**
```
current_streak = count of consecutive green days ending today (or yesterday
                 if today not yet complete).
best_streak    = max run of green days over all history.
per-habit streaks (e.g. "workout streak") use the same logic on a single category.
```
Computed client-side from cached logs; `daily_checkins.score` caches the result server-side so the weekly review and dashboard don't recompute from scratch.

### 4.7 Frontend Architecture

**4.7.1 Routes / screens**
```
/                 Dashboard (today's status, score ring, streaks, quick-add)
/log/food         Meal logger (+ templates, photo, calories)
/log/workout      Workout logger (+ templates, exercises)
/log/medicine     Today's doses -> Taken/Skipped
/log/steps        Daily step entry
/log/water        Water quick-add (+250 / +500 buttons)
/log/wellbeing    Mood / energy / sleep
/checkin          Evening daily check-in (one combined flow)
/progress         Charts: weight trend, score trend, step trend
/photos           Progress photo gallery (weekly)
/review           Weekly review
/settings         Meds schedule, reminders, goals, notification permission
/onboarding       Install-to-home-screen + enable notifications guide
```

**4.7.2 State management**
- **Server state:** TanStack Query, with a Dexie-backed persister so cache survives reloads/offline.
- **Local writes:** custom `useLog()` hook → writes Dexie + outbox → optimistic UI → background sync.
- **Auth/session:** `supabase-js` session in memory + secure storage; route guard redirects to `/onboarding` if unauthenticated.

**4.7.3 Dexie schema (client)**
```js
db.version(1).stores({
  food_logs:       'id, day, logged_at, _dirty',
  workout_logs:    'id, workout_day, _dirty',
  medication_logs: 'id, scheduled_for, status, _dirty',
  steps_log:       'id, day, _dirty',
  water_log:       'id, day, _dirty',
  body_metrics:    'id, day, _dirty',
  wellbeing_log:   'id, day, _dirty',
  daily_checkins:  'id, day, _dirty',
  outbox:          '++seq, table, op, id'   // pending sync operations
});
```
- `_dirty` flags locally-modified rows awaiting upload.
- `outbox` is an ordered queue of `{table, op:'upsert'|'delete', id}` processed FIFO.

**4.7.4 Sync engine**
```
flushOutbox():
  if offline: return
  for each item in outbox (FIFO):
     row = db[item.table].get(item.id)
     supabase.from(item.table).upsert(row)   // PK = client UUID => idempotent
     on success: clear _dirty, remove outbox item
     on auth error: refresh session, retry
     on network error: stop, retry later
triggers: 'online' event, app foreground (visibilitychange), 30s timer, post-login.
```

### 4.8 PWA Configuration
- **Manifest:** `display: standalone`, name, theme/background colors, maskable icons (192/512), `start_url: '/'`, `scope: '/'`.
- **Service worker:** Workbox via `vite-plugin-pwa` — precache app shell; runtime-cache GET API responses (stale-while-revalidate); never cache auth/push endpoints.
- **iOS specifics:** include `apple-touch-icon`; document that push requires home-screen install + iOS 16.4+; permission must be requested from a user gesture.

### 4.9 Edge Functions Summary
| Function | Trigger | Purpose |
|---|---|---|
| `reminder-dispatch` | `pg_cron` (1/min) | Send due reminder pushes; maintain dispatch log. |
| `push-subscribe` | Client POST | Persist/refresh a device push subscription. |
| `weekly-review` | `pg_cron` (Sun PM) | Aggregate the week, write `weekly_reviews`, optional push. |
| `cleanup-subscriptions` | `pg_cron` (daily) | Prune dead push endpoints (optional). |

### 4.10 Security
- RLS on every table; client uses anon key + user JWT only.
- Edge Functions use the service-role key (server-side secret) and always filter by `user_id`.
- VAPID private key, service-role key, and cron secret stored as Edge Function / DB secrets — never shipped to the client.
- Storage objects private; served via short-lived signed URLs.
- Cron→function call authenticated with a shared secret header.

---

## 5. Build Sequence (recommended)

1. **Foundation:** Supabase project, schema + RLS, Auth (magic link), base React/Vite PWA shell installable on iPhone.
2. **Logging core (offline-first):** food, workout, medicine, steps + Dexie/outbox sync. This is the daily-use heart of the app.
3. **Reminder pipeline:** push subscription flow → `reminder-dispatch` Edge Function → `pg_cron`. Build and verify end-to-end **first among server features**, since scheduled push to an iOS PWA is the riskiest piece.
4. **Consistency layer:** daily check-in, score, streaks, dashboard.
5. **Extras:** water, weight/body metrics, mood/energy/sleep, progress photos, templates, weekly review.
6. **Polish:** onboarding (install + notifications), empty states, charts, settings.

## 6. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| iOS push only works when installed to home screen | Onboarding gates notification setup behind an explicit "Add to Home Screen" step + checks `display-mode: standalone`. |
| iOS may evict PWA data when unused for long periods | Server (Postgres) is the source of truth; local Dexie is a cache, so eviction loses nothing once synced. |
| `pg_cron` minute drift / cold starts | Grace window + `(reminder_id, fired_for)` unique de-dupe. |
| Timezone correctness for day boundaries & reminders | Store `profiles.timezone`; compute logical day and fire instants in that TZ. |
| No automatic steps (manual entry friction) | Make step entry a single field on the daily check-in; pre-fill yesterday's value as a hint. |

## 7. Out of Scope (v1)
Data export/backup; Mi Band / Apple Health / Apple Watch integration; automatic step counting; native app store distribution; social/multiplayer features; AI plan generation.
