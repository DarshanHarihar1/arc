// Consistency score (§4.6.1). Pure functions, unit-tested against hand-computed
// fixtures and reused by the check-in (to cache the score) and the dashboard.

export type Category = "workout" | "meals" | "meds" | "steps" | "water";

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  workout: 30,
  meals: 25,
  meds: 25,
  steps: 10,
  water: 10,
};

export const DEFAULT_CATEGORIES: Category[] = ["workout", "meals", "meds", "steps", "water"];

export const GREEN_THRESHOLD = 80;

export type DayCompletion = Partial<Record<Category, boolean>>;

// Weighted score over the enabled categories, normalized to 0–100 with one decimal
// (matches daily_checkins.score numeric(4,1)). Disabling a category drops it from
// the denominator.
export function computeScore(
  done: DayCompletion,
  enabled: Category[] = DEFAULT_CATEGORIES,
): number {
  const denom = enabled.reduce((sum, c) => sum + CATEGORY_WEIGHTS[c], 0);
  if (denom === 0) return 0;
  const earned = enabled.reduce((sum, c) => sum + (done[c] ? CATEGORY_WEIGHTS[c] : 0), 0);
  return Math.round((earned / denom) * 1000) / 10;
}

export function isGreen(score: number, threshold = GREEN_THRESHOLD): boolean {
  return score >= threshold;
}
