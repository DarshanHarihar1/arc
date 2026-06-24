import { describe, it, expect } from "vitest";
import { isDue, fireInstant, zonedParts } from "./reminders.ts";

// 2024-06-24 is a Monday (weekday 1). June => IST is UTC+5:30, New York is EDT (UTC-4).

describe("zonedParts", () => {
  it("reads the wall clock and weekday in the target timezone", () => {
    // 03:30Z == 09:00 IST, Monday
    const p = zonedParts(new Date("2024-06-24T03:30:00Z"), "Asia/Kolkata");
    expect(p).toMatchObject({ year: 2024, month: 6, day: 24, hour: 9, minute: 0, weekday: 1 });
  });
});

describe("fireInstant", () => {
  it("resolves a local time to the correct UTC instant (Asia/Kolkata)", () => {
    const fire = fireInstant(new Date("2024-06-24T03:30:00Z"), "Asia/Kolkata", "09:00");
    expect(fire.toISOString()).toBe("2024-06-24T03:30:00.000Z");
  });

  it("resolves a local time to the correct UTC instant (America/New_York, EDT)", () => {
    const fire = fireInstant(new Date("2024-06-24T11:30:00Z"), "America/New_York", "07:30");
    expect(fire.toISOString()).toBe("2024-06-24T11:30:00.000Z");
  });
});

describe("isDue", () => {
  const reminder = { time_of_day: "09:00", days_of_week: [1] }; // Mondays only

  it("is due exactly at the fire instant", () => {
    const { due } = isDue(reminder, new Date("2024-06-24T03:30:00Z"), "Asia/Kolkata");
    expect(due).toBe(true);
  });

  it("is due within the ±90s grace window", () => {
    const { due } = isDue(reminder, new Date("2024-06-24T03:31:00Z"), "Asia/Kolkata");
    expect(due).toBe(true);
  });

  it("is not due outside the grace window", () => {
    const { due } = isDue(reminder, new Date("2024-06-24T03:32:00Z"), "Asia/Kolkata");
    expect(due).toBe(false);
  });

  it("is not due on a weekday that is not enabled", () => {
    // Same instant, but only Tuesdays (2) enabled.
    const { due } = isDue(
      { time_of_day: "09:00", days_of_week: [2] },
      new Date("2024-06-24T03:30:00Z"),
      "Asia/Kolkata",
    );
    expect(due).toBe(false);
  });

  it("computes the timezone-correct fire instant for New York", () => {
    const { due, fireInstant: fi } = isDue(
      { time_of_day: "07:30", days_of_week: [1] },
      new Date("2024-06-24T11:30:00Z"),
      "America/New_York",
    );
    expect(due).toBe(true);
    expect(fi.toISOString()).toBe("2024-06-24T11:30:00.000Z");
  });

  it("does not fire the same minute across timezones with different offsets", () => {
    // 03:30Z is 09:00 in Kolkata but 23:30 (prev day) in New York — a 09:00
    // reminder should only be due in Kolkata.
    const now = new Date("2024-06-24T03:30:00Z");
    expect(isDue(reminder, now, "Asia/Kolkata").due).toBe(true);
    expect(isDue(reminder, now, "America/New_York").due).toBe(false);
  });
});
