import { describe, it, expect } from "vitest";
import { computeScore, isGreen, type Category } from "./score";

// Default enabled categories (water disabled): Workout 30 / Meals 25 / Meds 25 /
// Steps 10 — denominator 90. Scores below are hand-computed against that.

describe("computeScore", () => {
  it("scores a perfect default day at 100", () => {
    expect(computeScore({ workout: true, meals: true, meds: true, steps: true })).toBe(100);
  });

  it("scores an empty day at 0", () => {
    expect(computeScore({})).toBe(0);
  });

  it("scores a single category against the full denominator", () => {
    // 30 / 90 = 33.3
    expect(computeScore({ workout: true })).toBe(33.3);
  });

  it("scores a green-but-not-perfect day", () => {
    // workout + meals + meds = 80 / 90 = 88.9
    expect(computeScore({ workout: true, meals: true, meds: true })).toBe(88.9);
  });

  it("scores a sub-threshold day", () => {
    // workout + meals = 55 / 90 = 61.1
    expect(computeScore({ workout: true, meals: true })).toBe(61.1);
  });

  it("includes water when it is enabled (denominator 100)", () => {
    const all: Category[] = ["workout", "meals", "meds", "steps", "water"];
    expect(computeScore({ workout: true, meals: true, meds: true, steps: true }, all)).toBe(90);
    expect(
      computeScore({ workout: true, meals: true, meds: true, steps: true, water: true }, all),
    ).toBe(100);
  });

  it("drops a disabled category from the denominator (normalization)", () => {
    // Disable steps → denominator 80. workout + meals = 55 / 80 = 68.8
    const enabled: Category[] = ["workout", "meals", "meds"];
    expect(computeScore({ workout: true, meals: true }, enabled)).toBe(68.8);
  });

  it("returns 0 when no category is enabled", () => {
    expect(computeScore({ workout: true }, [])).toBe(0);
  });
});

describe("isGreen", () => {
  it("is green at or above the 80 threshold", () => {
    expect(isGreen(88.9)).toBe(true);
    expect(isGreen(80)).toBe(true);
  });

  it("is not green below the threshold", () => {
    expect(isGreen(61.1)).toBe(false);
  });
});
