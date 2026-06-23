import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { newId } from "@/sync/useLog";
import { useMedications, useMedicationMutations, type Medication } from "@/data/medications";

export function MedicationsManager() {
  const { data: meds, isLoading, isError } = useMedications();
  const { save, remove } = useMedicationMutations();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState("09:00, 21:00");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const schedule = times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((time) => ({ time }));
    const med: Omit<Medication, "user_id"> = {
      id: newId(),
      name: name.trim(),
      dosage: dosage.trim() || null,
      schedule,
      active: true,
    };
    await save.mutateAsync(med);
    setName("");
    setDosage("");
    setTimes("09:00, 21:00");
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">Medications</h2>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Couldn’t load medications (needs the backend to be live).
        </p>
      )}

      {meds?.map((m) => (
        <div key={m.id} className="flex items-center justify-between border-t border-border pt-2">
          <div>
            <p className="text-sm font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">
              {m.dosage ? `${m.dosage} · ` : ""}
              {m.schedule.map((s) => s.time).join(", ")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => remove.mutate(m.id)}>
            Remove
          </Button>
        </div>
      ))}

      <form onSubmit={add} className="space-y-2 border-t border-border pt-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vitamin D" />
        </Field>
        <Field label="Dosage">
          <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 tablet" />
        </Field>
        <Field label="Times (comma-separated, HH:MM)">
          <Input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="09:00, 21:00" />
        </Field>
        <Button type="submit" variant="outline" disabled={save.isPending}>
          Add medication
        </Button>
      </form>
    </Card>
  );
}
