# Phase 2 — Logging Core (offline-first)

**Goal:** Make the daily-use heart of the app work: log food, workouts, medicine doses,
and steps with a frictionless few-taps flow that works offline and feels instant. This
phase builds and proves the offline-first sync engine that every later feature reuses.

Spec references: §3.4A (logging flow), §3.5 (offline & sync), §4.1.2–4.1.5 (food,
workouts, medications, steps), §4.7.2–4.7.4 (state, Dexie, sync engine).

## Scope

### Local store & sync engine
- Dexie/IndexedDB store with the client schema from §4.7.3 (`food_logs`, `workout_logs`,
  `medication_logs`, `steps_log`, plus the `outbox` queue and `_dirty` flags).
- `useLog()` hook: writes go to Dexie + outbox first → optimistic UI update → never block
  on the network.
- `flushOutbox()` sync engine (§4.7.4): FIFO upsert via `supabase-js` using the
  client-generated UUID as PK (idempotent). Triggers: `online` event,
  `visibilitychange` (foreground), 30s timer, post-login.
- TanStack Query backed by a Dexie persister so reads are instant and survive reload.
- Last-write-wins conflict policy via `updated_at`.

### Logging screens
- `/log/food` — meal logger: meal type, title, optional notes/calories, optional photo.
  Photo path is stored on the row; the upload itself can be deferred to Phase 5 polish if
  Storage wiring is heavy, but the schema field is populated when present.
- `/log/workout` — workout logger: type, duration, notes, and child `workout_exercises`
  rows (name/sets/reps/weight).
- `/log/medicine` — today's scheduled doses rendered from `medications.schedule`, each
  with a one-tap **Taken / Skipped** that writes a `medication_logs` row (upsert on
  `(medication_id, scheduled_for)`).
- `/log/steps` — single daily step entry, upsert on `(user_id, day)`.
- Basic `medications` CRUD in settings so doses exist to log against.

## Out of Scope
- Reminders / push (Phase 3).
- Consistency score, streaks, dashboard aggregation (Phase 4).
- Water, body metrics, wellbeing, progress photos, templates, weekly review (Phase 5).

## Acceptance Criteria
- With the network disabled, a user can log a meal, a workout, a medicine dose, and steps;
  the UI updates immediately and the entries persist across a reload.
- On reconnect (or foreground/login), the outbox flushes and rows appear in Postgres with
  matching UUIDs; re-running the flush produces no duplicates.
- Logging a medicine dose twice for the same instant updates one row, not two.
- Steps entry for a day overwrites the previous value for that day.
- All writes respect RLS (rows land under the signed-in `user_id`).

## Verifiable Goals
1. Offline write → verify: airplane-mode test logs all four types and they survive reload.
2. Idempotent sync → verify: flushing the same outbox twice yields one row per UUID
   (assert row counts in Postgres).
3. Upsert semantics → verify: duplicate dose/step writes collapse to a single row per
   unique key.
4. Optimistic UX → verify: UI reflects a new log within one frame, before any network
   call resolves.
