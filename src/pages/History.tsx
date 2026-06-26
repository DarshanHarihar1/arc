import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import {
  UtensilsCrossed,
  Dumbbell,
  Pill,
  Footprints,
  Droplet,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db/db";
import { useMedications } from "@/data/medications";
import { todayStr, prevDay } from "@/lib/day";
import { SectionLabel } from "@/components/ui/kit";

type Entry = { icon: LucideIcon; title: string; sub: string; right?: string };

function dayLabel(day: string): string {
  if (day === todayStr()) return "today";
  if (day === prevDay(todayStr())) return "yesterday";
  return format(parseISO(day), "EEEE, MMMM d").toLowerCase();
}

// A read-only log of every past day, built from the local store (hydrated from
// the server by the sync-down). The Today screen only shows the current day;
// this is where earlier entries live.
export function History() {
  const foods = useLiveQuery(() => db.food_logs.toArray(), []);
  const workouts = useLiveQuery(() => db.workout_logs.toArray(), []);
  const steps = useLiveQuery(() => db.steps_log.toArray(), []);
  const waters = useLiveQuery(() => db.water_log.toArray(), []);
  const medLogs = useLiveQuery(() => db.medication_logs.toArray(), []);
  const wellbeing = useLiveQuery(() => db.wellbeing_log.toArray(), []);
  const checkins = useLiveQuery(() => db.daily_checkins.toArray(), []);
  const { data: meds } = useMedications();

  const loaded =
    foods !== undefined &&
    workouts !== undefined &&
    steps !== undefined &&
    waters !== undefined &&
    medLogs !== undefined &&
    wellbeing !== undefined &&
    checkins !== undefined;

  const medName = new Map((meds ?? []).map((m) => [m.id, m.name]));
  const scoreByDay = new Map((checkins ?? []).map((c) => [c.day, c.score]));

  // Group every logged entry under its calendar day.
  const byDay = new Map<string, Entry[]>();
  const add = (day: string, e: Entry) => {
    const list = byDay.get(day) ?? [];
    list.push(e);
    byDay.set(day, list);
  };

  for (const f of foods ?? []) {
    add(todayStr(new Date(f.logged_at)), {
      icon: UtensilsCrossed,
      title: f.title,
      sub: f.meal,
      right: f.calories != null ? String(f.calories) : undefined,
    });
  }
  for (const w of workouts ?? []) {
    add(w.workout_day, {
      icon: Dumbbell,
      title: `${w.type ?? "Workout"} workout`,
      sub: "logged",
      right: w.duration_min ? `${w.duration_min} min` : undefined,
    });
  }
  for (const s of steps ?? []) {
    add(s.day, { icon: Footprints, title: "Steps", sub: "logged", right: s.steps.toLocaleString() });
  }
  const waterByDay = new Map<string, number>();
  for (const w of waters ?? []) waterByDay.set(w.day, (waterByDay.get(w.day) ?? 0) + w.amount_ml);
  for (const [day, ml] of waterByDay) {
    add(day, { icon: Droplet, title: "Water", sub: "logged", right: `${ml.toLocaleString()} ml` });
  }
  for (const l of medLogs ?? []) {
    if (l.status !== "taken") continue;
    add(todayStr(new Date(l.scheduled_for)), {
      icon: Pill,
      title: medName.get(l.medication_id) ?? "Medication",
      sub: `taken · ${format(new Date(l.scheduled_for), "HH:mm")}`,
    });
  }
  for (const w of wellbeing ?? []) {
    const bits = [
      w.mood != null ? `mood ${w.mood}` : null,
      w.energy != null ? `energy ${w.energy}` : null,
      w.sleep_hours != null ? `${w.sleep_hours}h sleep` : null,
    ].filter(Boolean);
    if (!bits.length) continue;
    add(w.day, { icon: HeartPulse, title: "Wellbeing", sub: bits.join(" · ") });
  }

  const days = Array.from(byDay.keys()).sort().reverse();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em]">history</h1>
        <p className="mt-[7px] text-sm text-ink-soft">everything you've logged</p>
      </header>

      {loaded && days.length === 0 ? (
        <div className="flex flex-col items-center rounded-[20px] border border-line bg-white px-6 py-10 text-center shadow-card">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-canvas">
            <Footprints className="h-[22px] w-[22px] text-[#C7CDD4]" strokeWidth={1.8} />
          </div>
          <p className="mt-3 max-w-[230px] text-sm leading-relaxed text-ink-soft">
            Nothing logged yet. Your past days will appear here once you start logging.
          </p>
        </div>
      ) : (
        days.map((day) => {
          const entries = byDay.get(day)!;
          const score = scoreByDay.get(day);
          return (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between">
                <SectionLabel>{dayLabel(day)}</SectionLabel>
                {score != null && (
                  <span className="text-[12.5px] text-ink-faint">{Math.round(score)}%</span>
                )}
              </div>
              <div className="rounded-[20px] border border-line bg-white px-[18px] shadow-card">
                {entries.map((g, i) => {
                  const Icon = g.icon;
                  return (
                    <div
                      key={i}
                      className={
                        "flex items-center gap-3 py-3.5" +
                        (i < entries.length - 1 ? " border-b border-line-soft" : "")
                      }
                    >
                      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-tint text-primary">
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{g.title}</p>
                        <p className="text-xs capitalize text-ink-faint">{g.sub}</p>
                      </div>
                      {g.right ? (
                        <span className="font-mono text-[13px] text-ink-soft">{g.right}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
