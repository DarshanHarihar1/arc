import { useLiveQuery } from "dexie-react-hooks";
import { db, type DoseStatus, type MedicationLog } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { useMedications } from "@/data/medications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Dose {
  medicationId: string;
  name: string;
  time: string;
  scheduledFor: string;
}

export function Medicine() {
  const { upsert } = useLog();
  const { data: meds } = useMedications();
  const day = todayStr();

  const logs = useLiveQuery(() => db.medication_logs.toArray(), []);

  // Expand each active medication's schedule into today's dose instances.
  const doses: Dose[] = (meds ?? [])
    .filter((m) => m.active)
    .flatMap((m) =>
      (m.schedule ?? []).map((s) => ({
        medicationId: m.id,
        name: m.name,
        time: s.time,
        scheduledFor: new Date(`${day}T${s.time}:00`).toISOString(),
      })),
    )
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  function logFor(d: Dose): MedicationLog | undefined {
    return logs?.find(
      (l) => l.medication_id === d.medicationId && l.scheduled_for === d.scheduledFor,
    );
  }

  async function mark(d: Dose, status: DoseStatus) {
    const existing = logFor(d);
    const now = new Date().toISOString();
    await upsert("medication_logs", {
      id: existing?.id ?? newId(),
      medication_id: d.medicationId,
      scheduled_for: d.scheduledFor,
      status,
      acted_at: now,
      created_at: existing?.created_at ?? now,
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Today’s doses</h1>

      {doses.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            No medications scheduled. Add them in Settings.
          </p>
        </Card>
      )}

      {doses.map((d) => {
        const log = logFor(d);
        const status = log?.status ?? "pending";
        return (
          <Card key={`${d.medicationId}-${d.scheduledFor}`} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.time}</p>
              </div>
              {status !== "pending" && (
                <span
                  className={status === "taken" ? "text-sm text-primary" : "text-sm text-muted-foreground"}
                >
                  {status === "taken" ? "Taken" : "Skipped"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={status === "taken" ? "default" : "outline"}
                onClick={() => mark(d, "taken")}
              >
                Taken
              </Button>
              <Button
                size="sm"
                variant={status === "skipped" ? "default" : "outline"}
                onClick={() => mark(d, "skipped")}
              >
                Skipped
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
