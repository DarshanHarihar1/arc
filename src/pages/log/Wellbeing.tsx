import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={value === n ? "default" : "outline"}
            className="flex-1"
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ))}
      </div>
    </Field>
  );
}

export function Wellbeing() {
  const { upsert } = useLog();
  const day = todayStr();

  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");
  const prefilled = useRef(false);

  const rows = useLiveQuery(() => db.wellbeing_log.where("day").equals(day).toArray(), [day]);
  const existing = rows?.[0];

  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    if (existing.mood) setMood(existing.mood);
    if (existing.energy) setEnergy(existing.energy);
    if (existing.sleep_hours) setSleep(String(existing.sleep_hours));
    if (existing.notes) setNotes(existing.notes);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    await upsert("wellbeing_log", {
      id: existing?.id ?? newId(),
      day,
      mood,
      energy,
      sleep_hours: sleep ? Number(sleep) : null,
      notes: notes.trim() || null,
      created_at: existing?.created_at ?? now,
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Wellbeing</h1>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <RatingRow label="Mood (1–5)" value={mood} onChange={setMood} />
          <RatingRow label="Energy (1–5)" value={energy} onChange={setEnergy} />
          <Field label="Sleep (hours)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder="e.g. 7.5"
            />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
          </Field>
          <Button type="submit" className="w-full">
            {existing ? "Update" : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
