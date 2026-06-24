import { describe, it, expect } from "vitest";
import { currentStreak, bestStreak, type DayResult } from "./streak";

// Helper: build day results from a list of green dates.
function green(...dates: string[]): DayResult[] {
  return dates.map((day) => ({ day, green: true }));
}

describe("currentStreak", () => {
  const today = "2026-06-24";

  it("counts consecutive green days ending today", () => {
    const days = green("2026-06-22", "2026-06-23", "2026-06-24");
    expect(currentStreak(days, today)).toBe(3);
  });

  it("falls back to yesterday when today is not yet green (incomplete)", () => {
    const days = green("2026-06-21", "2026-06-22", "2026-06-23");
    expect(currentStreak(days, today)).toBe(3);
  });

  it("is 0 when neither today nor yesterday is green", () => {
    const days = green("2026-06-20", "2026-06-21");
    expect(currentStreak(days, today)).toBe(0);
  });

  it("stops at a gap", () => {
    // 24 + 23 green, 22 missing, 21 green → streak ending today is 2.
    const days = green("2026-06-21", "2026-06-23", "2026-06-24");
    expect(currentStreak(days, today)).toBe(2);
  });

  it("ignores a non-green day even if a row exists", () => {
    const days: DayResult[] = [
      { day: "2026-06-23", green: true },
      { day: "2026-06-24", green: false },
    ];
    // today not green → fall back to yesterday (green) → 1.
    expect(currentStreak(days, today)).toBe(1);
  });

  it("is 0 with no history", () => {
    expect(currentStreak([], today)).toBe(0);
  });
});

describe("bestStreak", () => {
  it("finds the longest run across history with gaps", () => {
    // Runs: [10,11,12] = 3, [20,21] = 2 → best 3.
    const days = green(
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-20",
      "2026-06-21",
    );
    expect(bestStreak(days)).toBe(3);
  });

  it("is 0 with no green days", () => {
    expect(bestStreak([{ day: "2026-06-24", green: false }])).toBe(0);
  });

  it("counts a single isolated green day as 1", () => {
    expect(bestStreak(green("2026-06-24"))).toBe(1);
  });
});
