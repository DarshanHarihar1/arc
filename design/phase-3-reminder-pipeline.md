# Phase 3 — Reminder Pipeline

**Goal:** Deliver scheduled Web Push notifications to an installed iOS PWA — the riskiest
piece in the whole system — and verify it end to end before building anything that
depends on it. When this phase is done, the user receives a real notification on a locked
iPhone and tapping it deep-links into the right log screen.

Spec references: §3.4B (reminder flow), §4.5 (reminder pipeline detail), §4.1.10–4.1.11
(reminders, dispatch log, push subscriptions), §4.9 (edge functions), §4.10 (security).

## Scope

### Client subscription flow (§4.5.3)
- After home-screen install, a settings action (user gesture) calls
  `Notification.requestPermission()`.
- On grant, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID
  public> })`.
- POST the subscription to the `push-subscribe` Edge Function → store in
  `push_subscriptions` (dedupe on `endpoint`).

### Service worker handlers (§4.5.4)
- `push` event → `showNotification(title, { body, tag, data:{ url }, badge })`.
- `notificationclick` → `clients.openWindow(url)` deep-link into the app.

### Edge Functions (Deno)
- `push-subscribe` — persist/refresh a device subscription.
- `reminder-dispatch` — the core dispatcher implementing the §4.5.2 logic:
  - compute "now" per user timezone, skip if weekday not in `days_of_week`,
  - compute the fire instant, apply the ±90s grace window,
  - de-dupe against `reminder_dispatch_log` on `(reminder_id, fired_for)`,
  - send Web Push (VAPID) to each `push_subscriptions` row,
  - delete subscriptions that return 404/410,
  - for medication reminders, ensure a `pending` `medication_logs` row exists for the dose,
  - insert the dispatch-log row.

### Scheduling
- `pg_cron` job running every minute that calls `reminder-dispatch` via
  `pg_net.http_post` with the shared cron-secret header (§4.5.1).

### Secrets & security (§4.10)
- VAPID keypair: private key as an Edge Function secret, public key shipped to client.
- Service-role key and cron secret stored as secrets — never shipped to the client.
- Cron→function call authenticated with the shared secret header.

### Reminders UI
- Minimal reminders CRUD in `/settings`: kind, title/body, `time_of_day`,
  `days_of_week`, deep link, active toggle. Enough to create the reminders the
  dispatcher fires.

## Out of Scope
- Weekly-review push (Phase 5).
- `cleanup-subscriptions` cron (optional; Phase 6 hardening).
- Consistency/dashboard UI (Phase 4).

## Acceptance Criteria
- A reminder created for "1 minute from now" delivers a push to an installed iOS PWA
  (iOS 16.4+) and to a desktop browser.
- Tapping the notification opens the app at the configured deep link.
- The dispatcher never sends two pushes for the same `(reminder_id, fired_for)`, even if
  cron double-fires (verified by the unique constraint + a forced double invoke).
- A reminder outside its `days_of_week` or grace window does not fire.
- A medication reminder leaves a `pending` dose ready for one-tap Taken/Skipped.
- Expired subscriptions (410) are pruned automatically.

## Verifiable Goals
1. End-to-end push → verify: a manually scheduled reminder produces a real notification on
   an installed device.
2. Idempotency → verify: invoking `reminder-dispatch` twice for the same minute inserts
   one `reminder_dispatch_log` row and sends one push.
3. Timezone & window correctness → verify: unit tests for the fire-instant/grace/weekday
   logic across timezones.
4. Subscription lifecycle → verify: a simulated 410 response removes the stored
   subscription.
