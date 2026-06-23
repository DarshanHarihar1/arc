# Phase 6 — Polish

**Goal:** Make the app pleasant, complete, and robust for daily personal use: a guided
onboarding that reliably gets push working on iOS, thoughtful empty states, refined
charts, a complete settings surface, and operational hardening.

Spec references: §4.7.1 (`/onboarding`, `/settings`), §4.8 (PWA/iOS specifics), §4.9
(`cleanup-subscriptions`), §6 (risks & mitigations).

## Scope

### Onboarding (§4.8, §6)
- `/onboarding` flow that gates notification setup behind an explicit "Add to Home Screen"
  step and checks `display-mode: standalone` before offering the enable-notifications
  button (iOS only allows push when installed).
- Clear iOS 16.4+ guidance and a fallback message for unsupported versions.
- Permission requested strictly from a user gesture.

### Settings (`/settings`)
- Consolidated surface: medication schedules, reminders, goals (`step_goal`,
  `water_goal_ml`), timezone, notification permission status, and score-category
  weights/enablement.
- Per-category enable/disable and "green day" threshold configuration.

### Empty states & UX
- First-run empty states for every log screen, the dashboard, charts, photos, and review.
- Loading/optimistic and error states; offline indicator.
- Refined charts (axes, ranges, tooltips) on `/progress`.

### Operational hardening
- `cleanup-subscriptions` `pg_cron` job (daily) to prune dead push endpoints (§4.9).
- Service-worker caching review: runtime stale-while-revalidate for GET API responses;
  never cache auth/push endpoints (§4.8).
- Accessibility pass (focus, contrast, labels) and basic performance budget check.

## Out of Scope
- Anything in spec §7 "Out of Scope (v1)": data export/backup, Mi Band / Apple Health /
  Apple Watch, automatic step counting, native app-store distribution, social features,
  AI plan generation.

## Acceptance Criteria
- A brand-new user can complete onboarding on an iPhone and end up with working push
  without external help.
- Onboarding correctly detects standalone mode and does not offer notifications in a
  non-installed Safari tab.
- Every screen has a sensible empty state; no raw "no data" blanks.
- Settings can change goals/weights/threshold and the dashboard score reflects them.
- `cleanup-subscriptions` removes endpoints that no longer exist.
- The PWA passes a full Lighthouse PWA audit and a basic a11y check.

## Verifiable Goals
1. Onboarding gating → verify: notification button is hidden until `display-mode:
   standalone` is true (tested in standalone vs. browser).
2. Settings → score → verify: changing a category weight/threshold updates the computed
   score in a test.
3. Subscription cleanup → verify: `cleanup-subscriptions` deletes a known-dead endpoint.
4. Quality gates → verify: Lighthouse PWA audit passes; automated a11y check has no
   critical violations.

## Milestones
- **M1 — Onboarding:** standalone-gated notification setup; iOS 16.4+ guidance.
- **M2 — Settings:** goals, weights, threshold, timezone, permission status.
- **M3 — UX:** empty states everywhere; offline indicator; refined charts.
- **M4 — Hardening:** `cleanup-subscriptions` cron; SW cache review; a11y + perf pass.

## Testing Criteria (release gate)
| # | Test | How | Pass |
|---|---|---|---|
| 1 | Onboarding gating | open in Safari tab vs installed | notify button hidden until standalone |
| 2 | Settings → score | change a weight/threshold | computed score reflects it |
| 3 | Empty states | fresh account | every screen shows a sensible empty state |
| 4 | Sub cleanup | seed a dead endpoint, run cron | endpoint removed |
| 5 | Quality | Lighthouse PWA audit + automated a11y | PWA passes; no critical a11y violations |
