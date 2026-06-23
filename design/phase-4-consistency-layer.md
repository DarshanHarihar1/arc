# Phase 4 — Consistency Layer

**Goal:** Turn raw logs into motivation. Deliver the evening daily check-in, the daily
consistency score, streaks, and the dashboard that makes adherence visible. This is the
app's primary motivator.

Spec references: §3.4C (dashboard/consistency flow), §4.1.12 (daily check-in), §4.6
(score & streaks), §4.7.1 (dashboard & check-in routes).

## Scope

### Daily check-in (§4.1.12, §4.7.1)
- `/checkin` — a single combined evening flow that closes out the day in ~30 seconds:
  workout done? meals logged? meds taken? steps done? water done?
- Writes a `daily_checkins` row (upsert on `(user_id, day)`), pre-filling answers from
  existing logs so the user mostly confirms rather than re-enters.
- Pre-fill the step field with yesterday's value as a hint (risk mitigation, §6).
- Caches the computed `score` and `completed_at` on the row.

### Consistency score (§4.6.1)
- Weighted per-category score (Workout 30 / Meals 25 / Medicines 25 / Steps 10 /
  Water 10), normalized over enabled categories to 0–100.
- "Green day" when `score ≥ 80` (threshold configurable).
- Computed client-side from cached logs; result cached to `daily_checkins.score` for
  reuse by the dashboard and the weekly review.

### Streaks (§4.6.2)
- `current_streak` = consecutive green days ending today (or yesterday if today not yet
  complete).
- `best_streak` = longest green-day run over all history.
- Per-habit streaks (e.g. workout streak) using the same logic on a single category.

### Dashboard (`/`)
- Today's status with a score ring, current/best streaks, and quick-add shortcuts into the
  log screens.
- Reads from the Dexie cache, revalidated against Postgres (TanStack Query).

## Out of Scope
- Charts/trends beyond the score ring (Phase 5 `/progress`).
- Water/body-metric/wellbeing inputs feeding the score — water already exists as a
  category in the score formula; its dedicated logging screen ships in Phase 5, so until
  then the water component is treated as a disabled/zero-weight category if no data.

## Acceptance Criteria
- Completing the check-in writes/updates exactly one `daily_checkins` row for the day with
  a cached score.
- The score matches the §4.6.1 formula for a set of known fixtures (hand-computed).
- A run of qualifying days produces the correct `current_streak` and `best_streak`.
- The dashboard renders today's score ring and streak counters from cached data while
  offline, then revalidates on reconnect.
- Disabling a category removes it from the denominator (normalization is correct).

## Verifiable Goals
1. Score correctness → verify: unit tests over fixture days reproduce hand-computed
   scores, including the enabled-category normalization.
2. Streak correctness → verify: unit tests over synthetic histories (gaps, today
   incomplete) produce expected current/best streaks.
3. Check-in idempotency → verify: re-submitting the check-in updates the single daily row.
4. Offline dashboard → verify: dashboard renders from Dexie with the network disabled.
