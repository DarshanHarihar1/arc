import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type DailyCheckin } from "@/db/db";
import { todayStr } from "@/lib/day";
import { isGreen } from "@/lib/score";
import { currentStreak, bestStreak, type DayResult } from "@/lib/streak";
import { useProfile } from "@/data/profile";
import { ScoreRing } from "@/components/ScoreRing";
import { Card } from "@/components/ui/card";

const quickLinks = [
  { to: "/log/food", label: "Meal" },
  { to: "/log/workout", label: "Workout" },
  { to: "/log/medicine", label: "Medicine" },
  { to: "/log/steps", label: "Steps" },
  { to: "/log/water", label: "Water" },
  { to: "/log/wellbeing", label: "Wellbeing" },
  { to: "/progress", label: "Progress" },
  { to: "/review", label: "Review" },
];

function toResults(rows: DailyCheckin[], pick: (r: DailyCheckin) => boolean): DayResult[] {
  return rows.map((r) => ({ day: r.day, green: pick(r) }));
}

export function Dashboard() {
  const day = todayStr();
  const { data: profile } = useProfile();
  const greenThreshold = profile?.green_threshold ?? 80;

  const checkins = useLiveQuery(() => db.daily_checkins.toArray(), []);
  const rows = checkins ?? [];
  const today = rows.find((r) => r.day === day);
  const score = today?.score ?? 0;

  const consistency = toResults(rows, (r) => isGreen(r.score ?? 0, greenThreshold));
  const workouts = toResults(rows, (r) => !!r.workout_done);

  const current = currentStreak(consistency, day);
  const best = bestStreak(consistency);
  const workoutStreak = currentStreak(workouts, day);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Today</h1>
          <p className="text-sm text-muted-foreground">
            {today
              ? isGreen(score, greenThreshold)
                ? "Green day"
                : "Keep going"
              : "Not checked in yet"}
          </p>
        </div>
        <Link to="/checkin" className="text-sm font-medium text-primary">
          {today ? "Edit" : "Check in"}
        </Link>
      </header>

      <Card className="flex items-center gap-5">
        <ScoreRing score={score} />
        <div className="grid flex-1 grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{current}</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{best}</p>
            <p className="text-xs text-muted-foreground">Best streak</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium tabular-nums">{workoutStreak}-day workout streak</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="flex h-20 items-center justify-center text-sm font-medium">
              {q.label}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
