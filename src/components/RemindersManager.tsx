import { useState, type ReactNode } from "react";
import { newId } from "@/sync/useLog";
import {
  useReminders,
  useReminderMutations,
  type Reminder,
  type ReminderKind,
} from "@/data/reminders";

// Reminders manager, styled to arc.dc.html §09 ("settings · reminders manager"):
// per-reminder rows with a kind icon, schedule in mono, and an on/off switch.

const KIND_META: Record<
  ReminderKind,
  { label: string; deepLink: string; icon: ReactNode }
> = {
  medication: {
    label: "Medication",
    deepLink: "/log/medicine",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="8" width="17" height="8" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  meal: {
    label: "Meal",
    deepLink: "/log/food",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 11h16M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  workout_checkin: {
    label: "Workout check-in",
    deepLink: "/checkin",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 12 11 14.5 15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  water: {
    label: "Water",
    deepLink: "/log/water",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  custom: {
    label: "Custom",
    deepLink: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // index 0=Sun

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-[46px] flex-none rounded-full transition-colors ${
        on ? "bg-[#2E9E6B]" : "bg-[#E1E6EA]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-6 w-6 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.18)] transition-all ${
          on ? "right-[2px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export function RemindersManager() {
  const { data: reminders, isLoading, isError } = useReminders();
  const { save, remove, setActive } = useReminderMutations();

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ReminderKind>("custom");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("21:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  function toggleDay(d: number) {
    setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || days.length === 0) return;
    const reminder: Omit<Reminder, "user_id"> = {
      id: newId(),
      kind,
      title: title.trim(),
      body: null,
      time_of_day: time,
      days_of_week: days,
      deep_link: KIND_META[kind].deepLink,
      ref_id: null,
      active: true,
    };
    await save.mutateAsync(reminder);
    setTitle("");
    setTime("21:00");
    setKind("custom");
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setAdding(false);
  }

  return (
    <div className="font-sans text-[#1E2630]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.07em] text-[#8A93A0]">
        Scheduled
      </p>

      {isLoading && <p className="text-sm text-[#9AA3AF]">Loading…</p>}
      {isError && (
        <p className="text-sm text-[#9AA3AF]">
          Couldn’t load reminders (needs the backend to be live).
        </p>
      )}

      {reminders && reminders.length > 0 && (
        <div className="rounded-[18px] border border-[#E8ECEF] bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          {reminders.map((r, i) => {
            const meta = KIND_META[r.kind];
            const on = r.active;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 py-[15px] ${
                  i < reminders.length - 1 ? "border-b border-[#F1F3F5]" : ""
                }`}
              >
                <div
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${
                    on ? "bg-[#EAF6EF] text-[#2E9E6B]" : "bg-[#F0F2F4] text-[#9AA3AF]"
                  }`}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[14.5px] font-semibold ${
                      on ? "" : "text-[#5C6775]"
                    }`}
                  >
                    {r.title}
                  </p>
                  <p className="mt-px font-mono text-xs text-[#9AA3AF]">
                    {r.time_of_day.slice(0, 5)}
                    {r.days_of_week.length < 7 && (
                      <span className="font-sans">
                        {" · "}
                        {r.days_of_week.map((d) => DAY_LABELS[d]).join("")}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove reminder"
                  onClick={() => remove.mutate(r.id)}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#F4F6F8] text-[#9AA3AF]"
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <Toggle on={on} onClick={() => setActive.mutate({ id: r.id, active: !on })} />
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom reminder */}
      {adding ? (
        <form
          onSubmit={add}
          className="mt-3 space-y-3 rounded-[18px] border border-[#E8ECEF] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]"
        >
          <p className="text-[13px] font-semibold text-[#5C6775]">Add a reminder</p>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReminderKind)}
            className="h-[46px] w-full rounded-[11px] border border-[#E1E6EA] bg-white px-3 text-sm outline-none focus-visible:border-[#2E9E6B]"
          >
            {(Object.keys(KIND_META) as ReminderKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. Stretch before bed"
            className="h-[46px] w-full rounded-[11px] border border-[#E1E6EA] bg-white px-3 text-sm outline-none placeholder:text-[#9AA3AF] focus-visible:border-[#2E9E6B]"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-[46px] w-full rounded-[11px] border border-[#E1E6EA] bg-white px-3 text-sm outline-none focus-visible:border-[#2E9E6B]"
          />
          <div>
            <p className="mb-1.5 text-xs text-[#9AA3AF]">Days</p>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`h-9 w-9 rounded-[10px] text-sm font-medium ${
                    days.includes(d)
                      ? "bg-[#2E9E6B] text-white"
                      : "border border-[#E1E6EA] text-[#9AA3AF]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="h-[46px] flex-1 rounded-[12px] bg-[#2E9E6B] text-sm font-semibold text-white disabled:opacity-70"
            >
              Save reminder
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-[46px] rounded-[12px] border border-[#E1E6EA] px-4 text-sm font-semibold text-[#5C6775]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-[13px] border border-[#2E9E6B] bg-white text-[14.5px] font-semibold text-[#1C7A50]"
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Add custom reminder
        </button>
      )}

      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[#E8ECEF] bg-white px-4 py-3.5">
        <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#F4F6F8] text-[#9AA3AF]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </div>
        <p className="flex-1 text-[12.5px] leading-snug text-[#9AA3AF]">
          Reminders are paused while notifications are disabled in iOS settings.
        </p>
      </div>
    </div>
  );
}
