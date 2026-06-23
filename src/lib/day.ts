import { format, startOfDay } from "date-fns";

// Phase 2 uses the device-local day. Server-side reminders use the profile
// timezone (Phase 3); for a single user logging on their own device these agree.

export function todayStr(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function startOfTodayISO(): string {
  return startOfDay(new Date()).toISOString();
}
