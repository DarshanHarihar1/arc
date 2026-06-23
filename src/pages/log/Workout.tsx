import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

interface ExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const emptyExercise = (): ExerciseDraft => ({ name: "", sets: "", reps: "", weight: "" });

export function Workout() {
  const { upsert } = useLog();
  const day = todayStr();
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);

  const today = useLiveQuery(() => db.workout_logs.where("workout_day").equals(day).toArray(), [day]);
  const todayExercises = useLiveQuery(() => db.workout_exercises.toArray(), []);

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setExercises((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const workoutId = newId();
    await upsert("workout_logs", {
      id: workoutId,
      logged_at: now,
      created_at: now,
      workout_day: day,
      type: type.trim() || null,
      duration_min: duration ? Number(duration) : null,
      notes: notes.trim() || null,
    });

    const filled = exercises.filter((x) => x.name.trim());
    for (let i = 0; i < filled.length; i++) {
      const x = filled[i];
      await upsert("workout_exercises", {
        id: newId(),
        workout_id: workoutId,
        name: x.name.trim(),
        sets: x.sets ? Number(x.sets) : null,
        reps: x.reps ? Number(x.reps) : null,
        weight_kg: x.weight ? Number(x.weight) : null,
        position: i,
      });
    }

    setType("");
    setDuration("");
    setNotes("");
    setExercises([emptyExercise()]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Log a workout</h1>

      <Card>
        <form onSubmit={save} className="space-y-3">
          <Field label="Type">
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="push / pull / legs / cardio" />
          </Field>
          <Field label="Duration (min)">
            <Input type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="—" />
          </Field>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Exercises</p>
            {exercises.map((x, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-5" value={x.name} onChange={(e) => updateExercise(i, { name: e.target.value })} placeholder="Name" />
                <Input className="col-span-2" type="number" inputMode="numeric" value={x.sets} onChange={(e) => updateExercise(i, { sets: e.target.value })} placeholder="sets" />
                <Input className="col-span-2" type="number" inputMode="numeric" value={x.reps} onChange={(e) => updateExercise(i, { reps: e.target.value })} placeholder="reps" />
                <Input className="col-span-3" type="number" inputMode="decimal" value={x.weight} onChange={(e) => updateExercise(i, { weight: e.target.value })} placeholder="kg" />
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setExercises((xs) => [...xs, emptyExercise()])}>
              + Add exercise
            </Button>
          </div>

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
          </Field>
          <Button type="submit" className="w-full">Save workout</Button>
        </form>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm text-muted-foreground">Today</h2>
        {today && today.length === 0 && (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        )}
        {today?.map((w) => {
          const count = todayExercises?.filter((x) => x.workout_id === w.id).length ?? 0;
          return (
            <Card key={w.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium capitalize">{w.type || "Workout"}</p>
                <p className="text-xs text-muted-foreground">
                  {count} exercise{count === 1 ? "" : "s"}
                  {w.duration_min ? ` · ${w.duration_min} min` : ""}
                </p>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
