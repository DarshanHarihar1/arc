// Pure, runtime-agnostic reminder-timing logic (§4.5.2). No Deno- or Node-specific
// imports, so it runs unchanged inside the edge function and under vitest.
//
// All math is done in the user's IANA timezone via Intl, so day boundaries and the
// fire instant are correct regardless of where the server runs.

export interface DueReminder {
  time_of_day: string; // local wall-clock "HH:MM" or "HH:MM:SS"
  days_of_week: number[]; // 0 = Sunday … 6 = Saturday
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The wall-clock parts of `date` as observed in `timeZone`.
export function zonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS.indexOf(map.weekday), // 0..6, 0=Sun
  };
}

// Offset in ms such that (utc instant) + offset == the wall clock read as if UTC.
// For Asia/Kolkata (UTC+5:30) this is +19_800_000.
export function tzOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

// The UTC instant of `timeOfDay` on the local day that contains `now`.
export function fireInstant(now: Date, timeZone: string, timeOfDay: string): Date {
  const [h, m, s = "0"] = timeOfDay.split(":");
  const local = zonedParts(now, timeZone);
  const targetAsUTC = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    Number(h),
    Number(m),
    Number(s),
  );
  // Subtract the tz offset to turn the wall-clock target into a real UTC instant.
  // Refine once so a DST transition near the target resolves to the right offset.
  let utc = targetAsUTC - tzOffsetMs(new Date(targetAsUTC), timeZone);
  utc = targetAsUTC - tzOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

// Is the reminder due at `now`? Due means: today's local weekday is enabled and
// `now` falls within ±graceSec of the fire instant. Returns the fire instant too,
// which is the de-dupe key written to reminder_dispatch_log.
export function isDue(
  r: DueReminder,
  now: Date,
  timeZone: string,
  graceSec = 90,
): { due: boolean; fireInstant: Date } {
  const local = zonedParts(now, timeZone);
  const fire = fireInstant(now, timeZone, r.time_of_day);
  const onDay = r.days_of_week.includes(local.weekday);
  const within = Math.abs(now.getTime() - fire.getTime()) <= graceSec * 1000;
  return { due: onDay && within, fireInstant: fire };
}
