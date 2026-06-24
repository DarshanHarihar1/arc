import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { startOfWeek, addDays, format } from "date-fns";
import { UtensilsCrossed, Dumbbell, Pill, Footprints, Check, Plus, type LucideIcon } from "lucide-react";
import { db, type DailyCheckin } from "@/db/db";
import { todayStr, startOfTodayISO } from "@/lib/day";
import { computeScore, isGreen, type Category } from "@/lib/score";
import { currentStreak, bestStreak, type DayResult } from "@/lib/streak";
import { useProfile } from "@/data/profile";
import { useMedications } from "@/data/medications";
import { useAuth } from "@/auth/AuthProvider";
import { useLog, newId } from "@/sync/useLog";
import { useIsStandalone } from "@/lib/usePwaDisplayMode";
import { isSubscribed, enablePush } from "@/lib/push";
import { SectionLabel } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";

const NUDGE_DISMISSED_KEY = "arc:push-nudge-dismissed";

// The four headline categories surfaced as log tiles on Today.
const TILE_CATEGORIES: Category[] = ["workout", "meals", "meds", "steps"];

function toResults(rows: DailyCheckin[], pick: (r: DailyCheckin) => boolean): DayResult[] {
  return rows.map((r) => ({ day: r.day, green: pick(r) }));
}

export function Dashboard() {
  const day = todayStr();
  const { session } = useAuth();
  const { upsert } = useLog();
  const { data: profile } = useProfile();
  const greenThreshold = profile?.green_threshold ?? 80;
  const stepGoal = profile?.step_goal ?? 8000;
  const waterGoal = profile?.water_goal_ml ?? 3000;
  const enabled = profile?.enabled_categories ?? TILE_CATEGORIES;

  // Today's logged data, read live from the local store.
  const foodToday = useLiveQuery(
    () => db.food_logs.where("logged_at").aboveOrEqual(startOfTodayISO()).toArray(),
    [],
  );
  const workoutToday = useLiveQuery(
    () => db.workout_logs.where("workout_day").equals(day).toArray(),
    [day],
  );
  const stepsRow = useLiveQuery(() => db.steps_log.where("day").equals(day).first(), [day]);
  const waterToday = useLiveQuery(() => db.water_log.where("day").equals(day).toArray(), [day]);
  const medLogs = useLiveQuery(() => db.medication_logs.toArray(), []);
  const { data: meds } = useMedications();
  const checkins = useLiveQuery(() => db.daily_checkins.toArray(), []);

  // Expand active medications into today's scheduled doses.
  const doses = (meds ?? [])
    .filter((m) => m.active)
    .flatMap((m) =>
      (m.schedule ?? []).map((s) => ({
        name: m.name,
        time: s.time,
        scheduledFor: new Date(`${day}T${s.time}:00`).toISOString(),
        medicationId: m.id,
      })),
    )
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  const dosesTaken = doses.filter((d) =>
    (medLogs ?? []).some(
      (l) => l.medication_id === d.medicationId && l.scheduled_for === d.scheduledFor && l.status === "taken",
    ),
  ).length;
  const dosesLeft = doses.length - dosesTaken;

  const stepsCount = stepsRow?.steps ?? 0;
  const waterTotal = (waterToday ?? []).reduce((sum, w) => sum + w.amount_ml, 0);

  // Auto-derived completion per category.
  const completion: Record<Category, boolean> = {
    workout: (workoutToday ?? []).length > 0,
    meals: (foodToday ?? []).length > 0,
    meds: doses.length > 0 && dosesLeft === 0,
    steps: !!stepsRow && stepsCount >= stepGoal,
    water: waterTotal >= waterGoal,
  };

  // Medicine only counts toward consistency when doses are actually scheduled —
  // otherwise a user with no medications would never reach 100%.
  const activeCats = (() => {
    let cats = TILE_CATEGORIES.filter((c) => enabled.includes(c));
    if (!cats.length) cats = [...TILE_CATEGORIES];
    if (doses.length === 0) cats = cats.filter((c) => c !== "meds");
    return cats;
  })();
  const score = computeScore(completion, activeCats);
  const loggedCount = activeCats.filter((c) => completion[c]).length;

  const loaded =
    foodToday !== undefined &&
    workoutToday !== undefined &&
    stepsRow !== undefined &&
    waterToday !== undefined &&
    medLogs !== undefined &&
    checkins !== undefined &&
    meds !== undefined;

  const rows = checkins ?? [];
  const existing = rows.find((r) => r.day === day);

  // Keep today's daily_checkins row in sync with the auto-derived score so streaks
  // and history stay accurate. Only write when something actually changed.
  useEffect(() => {
    if (!loaded) return;
    const same =
      existing &&
      existing.score === score &&
      !!existing.workout_done === completion.workout &&
      !!existing.meals_logged === completion.meals &&
      !!existing.meds_taken === completion.meds &&
      !!existing.steps_done === completion.steps &&
      !!existing.water_done === completion.water;
    if (same) return;
    const now = new Date().toISOString();
    void upsert("daily_checkins", {
      id: existing?.id ?? newId(),
      day,
      workout_done: completion.workout,
      meals_logged: completion.meals,
      meds_taken: completion.meds,
      steps_done: completion.steps,
      water_done: completion.water,
      score,
      completed_at: now,
      created_at: existing?.created_at ?? now,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, score, completion.workout, completion.meals, completion.meds, completion.steps, completion.water]);

  const consistency = toResults(rows, (r) => isGreen(r.score ?? 0, greenThreshold));
  const current = currentStreak(consistency, day);
  const best = bestStreak(consistency);
  const greenDays = new Set(consistency.filter((r) => r.green).map((r) => r.day));

  // Current week (Mon–Sun) dots.
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const ds = format(d, "yyyy-MM-dd");
    return { label: format(d, "EEEEE").toLowerCase(), ds, isToday: ds === day, green: greenDays.has(ds) };
  });

  // Push-permission nudge (only meaningful once installed).
  const standalone = useIsStandalone();
  const [showNudge, setShowNudge] = useState(false);
  useEffect(() => {
    if (!standalone) return;
    if (localStorage.getItem(NUDGE_DISMISSED_KEY)) return;
    isSubscribed().then((subscribed) => {
      if (!subscribed) setShowNudge(true);
    });
  }, [standalone]);

  async function handleEnablePush() {
    await enablePush();
    setShowNudge(false);
  }
  function dismissNudge() {
    localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    setShowNudge(false);
  }

  const initial = (profile?.display_name || session?.user.email || "?").trim().charAt(0).toUpperCase();
  const dateLabel = format(new Date(), "EEEE, MMMM d").toLowerCase();

  // Today-at-a-glance entries from logged data.
  const glance: { icon: LucideIcon; title: string; sub: string; right?: string; taken?: boolean }[] = [];
  for (const f of foodToday ?? []) {
    glance.push({ icon: UtensilsCrossed, title: f.title, sub: f.meal, right: f.calories != null ? String(f.calories) : undefined });
  }
  for (const w of workoutToday ?? []) {
    glance.push({
      icon: Dumbbell,
      title: `${w.type ?? "Workout"} workout`,
      sub: "logged",
      right: w.duration_min ? `${w.duration_min} min` : undefined,
    });
  }
  for (const d of doses) {
    const taken = (medLogs ?? []).some(
      (l) => l.medication_id === d.medicationId && l.scheduled_for === d.scheduledFor && l.status === "taken",
    );
    if (taken) glance.push({ icon: Pill, title: d.name, sub: `taken · ${d.time}`, taken: true });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em]">today</h1>
          <p className="mt-[7px] text-sm text-ink-soft">{dateLabel}</p>
        </div>
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-[15px] font-semibold text-green-deep"
        >
          {initial}
        </Link>
      </header>

      {showNudge && (
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card">
          <p className="text-sm text-ink-soft">Enable reminders to stay on track.</p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={handleEnablePush}>Enable</Button>
            <Button size="sm" variant="outline" onClick={dismissNudge}>Later</Button>
          </div>
        </div>
      )}

      {/* Consistency */}
      <div className="rounded-[20px] border border-line bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <SectionLabel>consistency</SectionLabel>
          <span className="text-[12.5px] text-ink-faint">{loggedCount} of {activeCats.length} logged</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="font-mono text-[52px] font-medium leading-none tracking-[-0.03em]"
            style={{ color: loggedCount === 0 ? "#C7CDD4" : "#2E9E6B" }}
          >
            {Math.round(score)}%
          </span>
          <span className="mb-1 text-[13px] text-ink-faint">today</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ECEFF2]">
          <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
        </div>
        {loggedCount === 0 && (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Nothing logged yet — tap a tile below to start your first habit today.
          </p>
        )}
      </div>

      {/* Streak */}
      <div className="rounded-[20px] border border-line bg-white px-5 py-[18px] shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-[7px]">
            <span
              className="font-mono text-[26px] font-semibold"
              style={{ color: current === 0 ? "#C7CDD4" : "#1E2630" }}
            >
              {current}
            </span>
            <span className="text-[13px] text-ink-soft">day streak</span>
          </div>
          {best > 0 ? (
            <span className="text-[12.5px] text-ink-faint">
              best · <span className="font-mono text-ink-soft">{best}</span>
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-faint">begin today</span>
          )}
        </div>
        <div className="mt-3.5 flex justify-between">
          {week.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={
                  d.isToday
                    ? "box-border h-[11px] w-[11px] rounded-full border-2 border-primary"
                    : "h-[11px] w-[11px] rounded-full"
                }
                style={
                  d.isToday
                    ? d.green
                      ? { background: "#2E9E6B", border: "none" }
                      : undefined
                    : { background: d.green ? "#2E9E6B" : "#D7DEE3" }
                }
              />
              <span className={d.isToday ? "text-[11px] font-semibold text-primary" : "text-[11px] text-ink-faint"}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Log tiles */}
      <div>
        <SectionLabel className="mb-3">log</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            to="/log/food"
            icon={UtensilsCrossed}
            title="meal"
            sub={completion.meals ? `${(foodToday ?? []).length} today` : "nothing yet"}
            done={completion.meals}
            badge={completion.meals ? "logged" : "add"}
          />
          <Tile
            to="/log/workout"
            icon={Dumbbell}
            title="workout"
            sub={
              completion.workout
                ? `${workoutToday?.[0]?.type ?? "done"}${workoutToday?.[0]?.duration_min ? ` · ${workoutToday?.[0]?.duration_min} min` : ""}`
                : "nothing yet"
            }
            done={completion.workout}
            badge={completion.workout ? "logged" : "add"}
          />
          <Tile
            to="/log/medicine"
            icon={Pill}
            title="medicine"
            sub={doses.length === 0 ? "none scheduled" : `${dosesTaken} of ${doses.length} taken`}
            done={completion.meds && doses.length > 0}
            badge={doses.length === 0 ? "add" : dosesLeft > 0 ? `${dosesLeft} left` : "logged"}
          />
          <Tile
            to="/log/steps"
            icon={Footprints}
            title="steps"
            sub={stepsRow ? `${stepsCount.toLocaleString()} steps` : "not yet today"}
            done={completion.steps}
            badge={stepsRow ? "logged" : "add"}
          />
        </div>
      </div>

      {/* Today at a glance */}
      <div>
        <SectionLabel className="mb-3">today at a glance</SectionLabel>
        {glance.length === 0 ? (
          <div className="flex flex-col items-center rounded-[20px] border border-line bg-white px-6 py-8 text-center shadow-card">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-canvas">
              <Footprints className="h-[22px] w-[22px] text-[#C7CDD4]" strokeWidth={1.8} />
            </div>
            <p className="mt-3 max-w-[230px] text-sm leading-relaxed text-ink-soft">
              Your day fills in here as you log. Every entry nudges your consistency up.
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] border border-line bg-white px-[18px] shadow-card">
            {glance.map((g, i) => {
              const Icon = g.icon;
              return (
                <div
                  key={i}
                  className={
                    "flex items-center gap-3 py-3.5" +
                    (i < glance.length - 1 ? " border-b border-line-soft" : "")
                  }
                >
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-tint text-primary">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{g.title}</p>
                    <p className="text-xs capitalize text-ink-faint">{g.sub}</p>
                  </div>
                  {g.taken ? (
                    <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-green-deep">taken</span>
                  ) : g.right ? (
                    <span className="font-mono text-[13px] text-ink-soft">{g.right}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({
  to,
  icon: Icon,
  title,
  sub,
  done,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  done: boolean;
  badge: string;
}) {
  const isLogged = badge === "logged";
  const isAdd = badge === "add";
  return (
    <Link to={to} className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <div
          className={
            "flex h-[34px] w-[34px] items-center justify-center rounded-[10px] " +
            (done ? "bg-tint text-primary" : "bg-surface-soft text-ink-soft")
          }
        >
          <Icon className="h-[19px] w-[19px]" strokeWidth={1.7} />
        </div>
        <span
          className={
            "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold " +
            (isLogged ? "bg-tint text-green-deep" : "bg-surface-soft text-ink-soft")
          }
        >
          {isLogged ? <Check className="h-[9px] w-[9px]" strokeWidth={3} /> : isAdd ? <Plus className="h-[9px] w-[9px]" strokeWidth={3} /> : null}
          {badge}
        </span>
      </div>
      <p className="mt-3 text-[15px] font-semibold capitalize">{title}</p>
      <p className="mt-0.5 text-xs capitalize text-ink-faint">{sub}</p>
    </Link>
  );
}
