import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { Pill, Check } from "lucide-react";
import { db, type DoseStatus, type MedicationLog } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { useMedications } from "@/data/medications";
import { Button } from "@/components/ui/button";
import { LogHeader } from "@/components/ui/kit";

interface Dose {
  medicationId: string;
  name: string;
  dosage: string | null;
  time: string;
  scheduledFor: string;
}

export function Medicine() {
  const { upsert } = useLog();
  const { data: meds } = useMedications();
  const navigate = useNavigate();
  const day = todayStr();

  const logs = useLiveQuery(() => db.medication_logs.toArray(), []);

  // Expand each active medication's schedule into today's dose instances.
  const doses: Dose[] = (meds ?? [])
    .filter((m) => m.active)
    .flatMap((m) =>
      (m.schedule ?? []).map((s) => ({
        medicationId: m.id,
        name: m.name,
        dosage: m.dosage,
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

  const taken = doses.filter((d) => logFor(d)?.status === "taken").length;

  function timeLabel(time: string) {
    const [h, m] = time.split(":").map(Number);
    const am = h < 12;
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m).padStart(2, "0")} ${am ? "am" : "pm"}`;
  }

  return (
    <div>
      <LogHeader
        title="today's doses"
        subtitle={doses.length > 0 ? `${taken} of ${doses.length} taken · ${doses.length - taken} remaining` : undefined}
      />

      {doses.length === 0 ? (
        <div className="flex flex-col items-center pt-16 text-center">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-line bg-white text-[#C7CDD4]">
            <Pill className="h-[30px] w-[30px]" strokeWidth={1.7} />
          </div>
          <p className="mt-[18px] text-lg font-semibold">No medications yet</p>
          <p className="mt-2 max-w-[250px] text-sm leading-relaxed text-ink-soft">
            Add your medications in settings and arc will line up each day's doses here.
          </p>
          <Button className="mt-5" onClick={() => navigate("/settings")}>Go to settings</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {doses.map((d) => {
            const status = logFor(d)?.status ?? "pending";
            const faded = status === "skipped";
            return (
              <div
                key={`${d.medicationId}-${d.scheduledFor}`}
                className={
                  "flex items-center gap-3 rounded-2xl border p-4 " +
                  (status === "taken" ? "border-[#DCEBE3] bg-white" : faded ? "border-line bg-[#FAFBFC]" : "border-line bg-white")
                }
              >
                <div
                  className={
                    "flex h-[42px] w-[42px] items-center justify-center rounded-xl " +
                    (status === "taken" ? "bg-tint text-primary" : faded ? "bg-surface-soft text-[#B6BDC6]" : "bg-surface-soft text-ink-soft")
                  }
                >
                  <Pill className="h-[21px] w-[21px]" strokeWidth={1.7} />
                </div>
                <div className="flex-1">
                  <p className={"text-[15.5px] font-semibold " + (faded ? "text-ink-faint" : "")}>{d.name}</p>
                  <p className={"text-[12.5px] " + (faded ? "text-[#B6BDC6]" : "text-ink-faint")}>
                    {timeLabel(d.time)}
                    {d.dosage ? ` · ${d.dosage}` : ""}
                  </p>
                </div>

                {status === "taken" ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1.5 rounded-[10px] bg-primary px-3 py-1.5 text-[13px] font-semibold text-white">
                      <Check className="h-3 w-3" strokeWidth={2.4} /> taken
                    </span>
                    <button className="text-[11px] text-ink-faint" onClick={() => mark(d, "pending")}>undo</button>
                  </div>
                ) : faded ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-[10px] bg-surface-soft px-3 py-1.5 text-[13px] font-semibold text-ink-mute">skipped</span>
                    <button className="text-[11px] text-ink-faint" onClick={() => mark(d, "pending")}>undo</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => mark(d, "skipped")}
                      className="rounded-[10px] border border-[#DDE2E7] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-soft"
                    >
                      skip
                    </button>
                    <button
                      onClick={() => mark(d, "taken")}
                      className="rounded-[10px] bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-white"
                    >
                      taken
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
