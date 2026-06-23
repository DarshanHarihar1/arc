# Phase 5 — Extras

**Goal:** Round out the in-scope feature set with the additive logs and the weekly review.
These reuse the offline-first logging, sync, and scoring patterns established in
Phases 2–4, so each is small on its own.

Spec references: §2 (items 8–13), §4.1.6–4.1.9 (water, body metrics, wellbeing, progress
photos), §4.1.2/4.1.3 (templates), §4.1.13 (weekly review), §4.4 (storage), §4.9
(`weekly-review` edge function).

## Scope

### Water (§4.1.6, §4.7.1)
- `/log/water` — quick-add buttons (+250 / +500 ml); appends `water_log` rows.
- Daily total feeds the consistency-score water category and `water_goal_ml`.

### Weight / body metrics (§4.1.7)
- `/progress` weight entry: weight, optional body-fat %, waist; upsert on `(user_id, day)`.
- Trend line chart (Recharts) for weight over time.

### Mood / energy / sleep (§4.1.8)
- `/log/wellbeing` — mood (1–5), energy (1–5), sleep hours, notes; upsert on
  `(user_id, day)`.

### Progress photos (§4.1.9, §4.4)
- `/photos` — weekly progress photo capture and gallery.
- Client-side image compression (≤1080px, ~70% quality) before upload to the private
  `progress-photos` bucket; access via short-lived signed URLs.
- Wire up the deferred `meal-photos` upload from Phase 2 here as well (same compression +
  signed-URL pattern).

### Quick-log templates (§4.1.2, §4.1.3)
- Meal templates (favorite meals) and workout templates (usual gym splits).
- Create-from / save-as-template flows on the food and workout loggers; sort by
  `use_count`; increment `use_count` on use.

### Charts (`/progress`)
- Weight trend, consistency-score trend, and step trend (Recharts), reading from cache.

### Weekly review (§3.4D, §4.1.13, §4.9)
- `weekly-review` Edge Function triggered by `pg_cron` on Sunday evening (per-user TZ):
  aggregates the past 7 days into a `weekly_reviews` row (`summary` jsonb + `avg_score`)
  and sends an optional "Your week is ready" push.
- `/review` screen renders the latest weekly summary.

## Out of Scope
- Data export/backup (explicitly out of scope for v1, spec §1.3/§7).
- Any device/health integrations (spec §1.3).
- Onboarding, empty states, and final settings polish (Phase 6).

## Acceptance Criteria
- Water quick-add accumulates a correct daily total that feeds the score.
- Body metrics and wellbeing upsert one row per day and render trends.
- A progress photo uploads (compressed) to the private bucket and displays via a signed
  URL; no public access.
- Saving and reusing a template prefills the logger and increments `use_count`.
- The `weekly-review` function produces one `weekly_reviews` row per user per week with a
  correct `avg_score`, and `/review` displays it.

## Verifiable Goals
1. Aggregation correctness → verify: unit/integration test of `weekly-review` over a
   fixture week reproduces hand-computed aggregates and `avg_score`.
2. Storage privacy → verify: an unsigned request to a photo object is denied; a signed URL
   succeeds and expires.
3. Template reuse → verify: using a template increments `use_count` and prefills fields.
4. Score integration → verify: water/steps totals correctly flip their category to
   "complete" at the goal thresholds.

## Milestones
- **M1 — Water:** quick-add totals feed the score.
- **M2 — Body metrics:** daily upsert + weight trend chart.
- **M3 — Wellbeing:** mood/energy/sleep daily upsert.
- **M4 — Photos:** compressed upload to private bucket; gallery via signed URLs; wires the deferred meal-photo upload.
- **M5 — Templates:** save/reuse meal & workout templates; `use_count` ordering.
- **M6 — Weekly review:** `weekly-review` function + `/review` screen.

## Testing Criteria (gate before Phase 6)
| # | Test | How | Pass |
|---|---|---|---|
| 1 | Water total | quick-add several amounts | daily total correct; score category flips at goal |
| 2 | Metrics/wellbeing | save twice for a day | one row per `(user_id, day)`; trends render |
| 3 | Photo privacy | request object without a signed URL | denied; signed URL works and expires |
| 4 | Template reuse | use a template | fields prefilled; `use_count` increments |
| 5 | Weekly aggregate | run `weekly-review` over a fixture week | one row; `avg_score` matches hand calc |
