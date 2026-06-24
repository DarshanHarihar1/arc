import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { computeScore, isGreen } from "@/lib/score";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Personalised step goals land with profile settings (Phase 6); until then the
// prefill uses the schema default.
const DEFAULT_STEP_GOAL = 8000;

type AnswerKey = "workout" | "meals" | "meds" | "steps";

const QUESTIONS: { key: AnswerKey; label: string }[] = [
  { key: "workout", label: "Workout done?" },
  { key: "meals", label: "Meals logged?" },
  { key: "meds", label: "Medicines taken?" },
  { key: "steps", label: "Steps done?" },
];

type Answers = Record<AnswerKey, boolean>;

export function Checkin() {
  const { upsert } = useLog();
  const navigate = useNavigate();
  const day = todayStr();

  // toArray (not first) so an empty result is [] — distinguishable from the
  // undefined that useLiveQuery returns while still loading.
  const checkinRows = useLiveQuery(() => db.daily_checkins.where("day").equals(day).toArray(), [day]);
  const workoutRows = useLiveQuery(() => db.workout_logs.where("workout_day").equals(day).toArray(), [day]);
  const foodRows = useLiveQuery(() => db.food_logs.toArray(), []);
  const medRows = useLiveQuery(() => db.medication_logs.toArray(), []);
  const stepsRows = useLiveQuery(() => db.steps_log.where("day").equals(day).toArray(), [day]);

  const existing = checkinRows?.[0];

  const [answers, setAnswers] = useState<Answers>({
    workout: false,
    meals: false,
    meds: false,
    steps: false,
  });
  const prefilled = useRef(false);

  const loaded =
    checkinRows !== undefined &&
    workoutRows !== undefined &&
    foodRows !== undefined &&
    medRows !== undefined &&
    stepsRows !== undefined;

  // Prefill once: from an existing check-in if the day was already closed out,
  // otherwise a best guess from today's logs. The user confirms or flips each.
  useEffect(() => {
    if (!loaded || prefilled.current) return;
    prefilled.current = true;

    if (existing) {
      setAnswers({
        workout: !!existing.workout_done,
        meals: !!existing.meals_logged,
        meds: !!existing.meds_taken,
        steps: !!existing.steps_done,
      });
      return;
    }

    const mealsToday = (foodRows ?? []).some((f) => todayStr(new Date(f.logged_at)) === day);
    const dosesToday = (medRows ?? []).filter((m) => todayStr(new Date(m.scheduled_for)) === day);
    const steps = stepsRows?.[0];
    setAnswers({
      workout: (workoutRows ?? []).length > 0,
      meals: mealsToday,
      meds: dosesToday.length > 0 && dosesToday.every((m) => m.status === "taken"),
      steps: !!steps && steps.steps >= DEFAULT_STEP_GOAL,
    });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const score = computeScore(answers);

  async function submit() {
    await upsert("daily_checkins", {
      id: existing?.id ?? newId(),
      day,
      workout_done: answers.workout,
      meals_logged: answers.meals,
      meds_taken: answers.meds,
      steps_done: answers.steps,
      score,
      completed_at: new Date().toISOString(),
      created_at: existing?.created_at ?? new Date().toISOString(),
    });
    navigate("/");
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Evening check-in</h1>
        <p className="text-sm text-muted-foreground">Close out today in a few taps.</p>
      </header>

      {QUESTIONS.map((q) => (
        <Card key={q.key} className="flex items-center justify-between">
          <p className="text-sm font-medium">{q.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={answers[q.key] ? "default" : "outline"}
              onClick={() => setAnswers((a) => ({ ...a, [q.key]: true }))}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant={!answers[q.key] ? "default" : "outline"}
              onClick={() => setAnswers((a) => ({ ...a, [q.key]: false }))}
            >
              No
            </Button>
          </div>
        </Card>
      ))}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Today’s score</p>
          <p className="text-xs text-muted-foreground">
            {isGreen(score) ? "Green day 🎉" : "Below 80"}
          </p>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{score}</span>
      </Card>

      <Button className="w-full" onClick={submit}>
        {existing ? "Update check-in" : "Save check-in"}
      </Button>
    </div>
  );
}
