import { nextDay, prevDay } from "./day";

// Streaks (§4.6.2). Generic over a per-day green flag so the same logic serves the
// overall consistency streak and any per-habit streak (e.g. a workout streak).

export interface DayResult {
  day: string; // yyyy-MM-dd
  green: boolean;
}

function greenSet(days: DayResult[]): Set<string> {
  return new Set(days.filter((d) => d.green).map((d) => d.day));
}

// Consecutive green days ending today — or ending yesterday when today is not yet
// green. The day isn't over, so an incomplete today doesn't break the streak.
export function currentStreak(days: DayResult[], today: string): number {
  const green = greenSet(days);
  let cursor: string;
  if (green.has(today)) cursor = today;
  else if (green.has(prevDay(today))) cursor = prevDay(today);
  else return 0;

  let count = 0;
  while (green.has(cursor)) {
    count++;
    cursor = prevDay(cursor);
  }
  return count;
}

// Longest run of consecutive calendar green days over all history.
export function bestStreak(days: DayResult[]): number {
  const green = greenSet(days);
  let best = 0;
  for (const day of green) {
    // Count each run once, from its first day (no green day immediately before).
    if (green.has(prevDay(day))) continue;
    let count = 0;
    let cursor = day;
    while (green.has(cursor)) {
      count++;
      cursor = nextDay(cursor);
    }
    best = Math.max(best, count);
  }
  return best;
}
