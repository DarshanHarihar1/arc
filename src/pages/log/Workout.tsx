import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Dumbbell } from "lucide-react";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { useWorkoutTemplates, useWorkoutTemplateMutations } from "@/data/templates";
import { Button } from "@/components/ui/button";
import { LogHeader, SectionLabel, Segmented } from "@/components/ui/kit";

interface ExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const emptyExercise = (): ExerciseDraft => ({ name: "", sets: "", reps: "", weight: "" });
const TYPES = ["push", "pull", "legs", "cardio"];

export function Workout() {
  const { upsert } = useLog();
  const day = todayStr();
  const [type, setType] = useState("push");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: templates } = useWorkoutTemplates();
  const { save: saveTemplate, use: useTemplate } = useWorkoutTemplateMutations();

  const today = useLiveQuery(() => db.workout_logs.where("workout_day").equals(day).toArray(), [day]);
  const todayExercises = useLiveQuery(() => db.workout_exercises.toArray(), []);

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setExercises((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function applyTemplate(t: NonNullable<typeof templates>[number]) {
    setType(t.type ?? "push");
    if (t.exercises && t.exercises.length > 0) {
      setExercises(
        t.exercises.map((e) => ({
          name: e.name,
          sets: e.sets ? String(e.sets) : "",
          reps: e.reps ? String(e.reps) : "",
          weight: e.weight_kg ? String(e.weight_kg) : "",
        })),
      );
    }
    useTemplate.mutate(t.id);
    setShowTemplates(false);
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

    setType("push");
    setDuration("");
    setNotes("");
    setExercises([emptyExercise()]);
  }

  async function saveAsTemplate() {
    const filled = exercises.filter((x) => x.name.trim());
    await saveTemplate.mutateAsync({
      id: newId(),
      name: type.trim() || "Workout",
      type: type.trim() || null,
      exercises: filled.map((x) => ({
        name: x.name.trim(),
        sets: x.sets ? Number(x.sets) : undefined,
        reps: x.reps ? Number(x.reps) : undefined,
        weight_kg: x.weight ? Number(x.weight) : undefined,
      })),
    });
  }

  return (
    <div>
      <LogHeader title="log a workout" />

      {templates && templates.length > 0 && (
        <div className="mb-4">
          <button type="button" className="text-sm font-medium text-primary" onClick={() => setShowTemplates((v) => !v)}>
            {showTemplates ? "Hide templates" : `Use a template (${templates.length})`}
          </button>
          {showTemplates && (
            <div className="mt-2 space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex w-full items-center justify-between rounded-2xl border border-line bg-white p-3.5 text-left shadow-card"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize">{t.name}</p>
                    <p className="text-xs text-ink-faint">{t.exercises?.length ?? 0} exercises</p>
                  </div>
                  <span className="text-xs text-ink-faint">used {t.use_count}×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={save}>
        <Segmented options={TYPES.map((t) => ({ value: t, label: t }))} value={type} onChange={setType} />

        <label className="mb-1.5 mt-[18px] block text-[13px] font-medium text-ink-soft">duration</label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="—"
            className="h-12 w-full rounded-xl border border-input bg-white px-3.5 pr-12 font-mono text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-faint">min</span>
        </div>

        <div className="mb-2 mt-[18px] flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink-soft">exercises</span>
          <span className="font-mono text-xs text-ink-faint">{exercises.filter((x) => x.name.trim()).length}</span>
        </div>
        <div className="space-y-2.5">
          {exercises.map((x, i) => (
            <div key={i} className="rounded-[14px] border border-line bg-white p-3.5">
              <input
                value={x.name}
                onChange={(e) => updateExercise(i, { name: e.target.value })}
                placeholder="exercise name"
                className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
              />
              <div className="mt-3 flex gap-2">
                {(["sets", "reps", "weight"] as const).map((field) => (
                  <div key={field} className="flex-1">
                    <div className="mb-1 text-[10.5px] lowercase tracking-[0.05em] text-ink-faint">
                      {field === "weight" ? "kg" : field}
                    </div>
                    <input
                      type="number"
                      inputMode={field === "weight" ? "decimal" : "numeric"}
                      value={x[field]}
                      onChange={(e) => updateExercise(i, { [field]: e.target.value } as Partial<ExerciseDraft>)}
                      className="h-[38px] w-full rounded-[9px] border border-line bg-white text-center font-mono text-sm text-ink outline-none focus-visible:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExercises((xs) => [...xs, emptyExercise()])}
          className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#DDE2E7] text-sm font-semibold text-primary"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> add exercise
        </button>

        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-soft">
          notes <span className="font-normal text-ink-faint">· optional</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="how did it go?"
          className="min-h-[58px] w-full rounded-xl border border-input bg-white p-3.5 text-sm leading-relaxed text-[#3A434F] outline-none placeholder:text-ink-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        />

        <Button type="submit" className="mt-[18px] h-[52px] w-full">Save workout</Button>
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={saveAsTemplate}>
          Save as template
        </Button>
      </form>

      <SectionLabel className="mb-3 mt-7">today</SectionLabel>
      {today && today.length === 0 ? (
        <p className="text-sm text-ink-faint">No workouts logged yet.</p>
      ) : (
        <div className="space-y-2.5">
          {today?.map((w) => {
            const count = todayExercises?.filter((x) => x.workout_id === w.id).length ?? 0;
            return (
              <div key={w.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-tint text-primary">
                  <Dumbbell className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold capitalize">{w.type || "workout"}</p>
                  <p className="text-xs text-ink-faint">
                    {count} exercise{count === 1 ? "" : "s"}
                  </p>
                </div>
                {w.duration_min ? <span className="font-mono text-[13px] text-ink-soft">{w.duration_min} min</span> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
