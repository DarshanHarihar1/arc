# Implementation Plan — Personal Fitness & Consistency Tracker

This document breaks the [technical specification](./fitness-pwa-tech-spec.md) into
sequential, independently shippable phases. Each phase has its own detailed file in
this directory and is designed to be reviewed, built, and merged before the next one
begins.

The phasing follows the spec's recommended build sequence (§5), front-loading the
riskiest pieces (offline sync, iOS push) so they are validated early.

## Phase Overview

| Phase | Name | Goal | Detail |
|---|---|---|---|
| 1 | Foundation | Supabase project, schema + RLS, auth, installable PWA shell | [phase-1-foundation.md](./phase-1-foundation.md) |
| 2 | Logging Core (offline-first) | Food, workout, medicine, steps logging with Dexie + outbox sync | [phase-2-logging-core.md](./phase-2-logging-core.md) |
| 3 | Reminder Pipeline | Push subscription → `reminder-dispatch` Edge Function → `pg_cron` | [phase-3-reminder-pipeline.md](./phase-3-reminder-pipeline.md) |
| 4 | Consistency Layer | Daily check-in, score, streaks, dashboard | [phase-4-consistency-layer.md](./phase-4-consistency-layer.md) |
| 5 | Extras | Water, body metrics, wellbeing, progress photos, templates, weekly review | [phase-5-extras.md](./phase-5-extras.md) |
| 6 | Polish | Onboarding, empty states, charts, settings, hardening | [phase-6-polish.md](./phase-6-polish.md) |

## Sequencing Rationale

1. **Foundation first** — nothing can be built or tested without the database, auth,
   and an installable shell. iOS push later depends on the app being installed to the
   home screen, so the installable shell is a hard prerequisite.
2. **Logging core before everything else** — this is the daily-use heart of the app and
   exercises the offline-first sync engine, which is the highest-risk client concern.
3. **Reminder pipeline before the consistency layer** — scheduled Web Push to an iOS PWA
   is the single riskiest server feature; it is built and verified end-to-end before
   investing in dependent UI.
4. **Consistency layer** — the daily check-in, score, and streaks are the primary
   motivator and depend on logging data already flowing.
5. **Extras** — additive features that reuse the patterns established in phases 2–4.
6. **Polish** — onboarding, charts, empty states, and settings that make the app
   pleasant and complete.

## Per-Phase Definition of Done

Every phase is considered complete only when:

- All listed deliverables are implemented.
- The acceptance criteria for the phase are met and demonstrated.
- Tests covering the phase's verifiable goals pass.
- Changes are committed and a PR is raised for review.

## Phase Gate Workflow

Each phase file carries a **Milestones** list (ordered build checkpoints) and a
**Testing Criteria** table (the concrete tests that gate the phase). The rule:

> A phase is not done until every row in its Testing Criteria passes. We run that
> gate, confirm it green, **then** start the next phase.

Phases 1 and 2 were built before the backend was provisioned, so their live tests
(sync, RLS, installability) are run against the real Supabase project as soon as it
exists — see [`supabase/SETUP.md`](../supabase/SETUP.md) — before Phase 3 begins.


## Cross-Cutting Conventions

These apply to all phases and are not repeated in each file:

- **Stack:** React 18 + TypeScript, Vite + `vite-plugin-pwa`, Tailwind + shadcn/ui,
  TanStack Query, Dexie.js, Supabase (Postgres + RLS, Auth, Storage, Edge Functions).
- **Identity & isolation:** RLS on every user-owned table from day one; client uses the
  anon key + user JWT only. Edge Functions use the service-role key and always filter by
  `user_id`.
- **Time:** all logical-day and reminder math is computed in the user's timezone
  (`profiles.timezone`).
- **Idempotency:** every record carries a client-generated UUID so re-sends are safe
  (upsert on PK).
