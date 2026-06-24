import { addDays, format, parseISO, startOfDay, subDays } from "date-fns";

// Phase 2 uses the device-local day. Server-side reminders use the profile
// timezone (Phase 3); for a single user logging on their own device these agree.

export function todayStr(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function startOfTodayISO(): string {
  return startOfDay(new Date()).toISOString();
}

// Calendar-day arithmetic on "yyyy-MM-dd" strings, used by the streak logic.
export function prevDay(day: string): string {
  return format(subDays(parseISO(day), 1), "yyyy-MM-dd");
}

export function nextDay(day: string): string {
  return format(addDays(parseISO(day), 1), "yyyy-MM-dd");
}
