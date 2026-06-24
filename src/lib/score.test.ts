import { describe, it, expect } from "vitest";
import { computeScore, isGreen, DEFAULT_CATEGORIES, type Category } from "./score";

// Default enabled categories (all five): Workout 30 / Meals 25 / Meds 25 /
// Steps 10 / Water 10 — denominator 100.

describe("computeScore", () => {
  it("scores a perfect day at 100", () => {
    expect(
      computeScore({ workout: true, meals: true, meds: true, steps: true, water: true }),
    ).toBe(100);
  });

  it("scores an empty day at 0", () => {
    expect(computeScore({})).toBe(0);
  });

  it("scores workout only: 30 / 100 = 30", () => {
    expect(computeScore({ workout: true })).toBe(30);
  });

  it("scores a green-but-not-perfect day (workout+meals+meds+steps = 90)", () => {
    expect(computeScore({ workout: true, meals: true, meds: true, steps: true })).toBe(90);
  });

  it("scores a day without workout (meals+meds+steps+water = 70)", () => {
    expect(computeScore({ meals: true, meds: true, steps: true, water: true })).toBe(70);
  });

  it("drops a disabled category from the denominator (normalization)", () => {
    // Disable water → denominator 90. workout + meals + meds = 80 / 90 = 88.9
    const noWater: Category[] = ["workout", "meals", "meds", "steps"];
    expect(computeScore({ workout: true, meals: true, meds: true }, noWater)).toBe(88.9);
  });

  it("includes only enabled categories in the denominator", () => {
    // Only workout enabled → 30/30 = 100
    expect(computeScore({ workout: true }, ["workout"])).toBe(100);
  });

  it("returns 0 when no category is enabled", () => {
    expect(computeScore({ workout: true }, [])).toBe(0);
  });

  it("DEFAULT_CATEGORIES has 5 entries including water", () => {
    expect(DEFAULT_CATEGORIES).toContain("water");
    expect(DEFAULT_CATEGORIES).toHaveLength(5);
  });
});

describe("isGreen", () => {
  it("is green at or above the 80 threshold", () => {
    expect(isGreen(90)).toBe(true);
    expect(isGreen(80)).toBe(true);
  });

  it("is not green below the threshold", () => {
    expect(isGreen(70)).toBe(false);
  });
});
