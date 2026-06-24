import { useState } from "react";
import { Plus, X } from "lucide-react";
import { newId } from "@/sync/useLog";
import { useMedications, useMedicationMutations, type Medication } from "@/data/medications";

// Medications manager, styled to arc.dc.html §07–08 ("settings · medications manager"):
// a list of saved medications with a remove control, plus an inline add card.
export function MedicationsManager() {
  const { data: meds, isLoading, isError } = useMedications();
  const { save, remove } = useMedicationMutations();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState("");

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
    setTimes("");
  }

  return (
    <div>
      {isLoading && <p className="text-sm text-ink-faint">Loading…</p>}
      {isError && (
        <p className="text-sm text-ink-faint">Couldn't load medications (needs the backend to be live).</p>
      )}

      {meds && meds.length > 0 && (
        <div className="rounded-[18px] border border-line bg-white px-4 shadow-card">
          {meds.map((m, i) => (
            <div
              key={m.id}
              className={"flex items-center gap-3 py-3.5" + (i < meds.length - 1 ? " border-b border-line-soft" : "")}
            >
              <div className="flex-1">
                <p className="text-[15px] font-semibold">{m.name}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-faint">
                  {m.dosage ? `${m.dosage} · ` : ""}
                  <span className="font-mono">{m.schedule.map((s) => s.time).join(", ")}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${m.name}`}
                onClick={() => remove.mutate(m.id)}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-canvas text-ink-faint"
              >
                <X className="h-[11px] w-[11px]" strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-3 rounded-[18px] border border-line bg-white p-4 shadow-card">
        <p className="mb-3 text-[13px] font-semibold text-ink-soft">Add a medication</p>
        <div className="flex flex-col gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name — e.g. magnesium"
            className="h-[46px] w-full rounded-[11px] border border-input bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary"
          />
          <input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="dosage — e.g. 200 mg"
            className="h-[46px] w-full rounded-[11px] border border-input bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary"
          />
          <input
            value={times}
            onChange={(e) => setTimes(e.target.value)}
            placeholder="times — 21:00  (hh:mm, comma separated)"
            className="h-[46px] w-full rounded-[11px] border border-input bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={save.isPending}
          className="mt-3 flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-primary bg-white text-[14.5px] font-semibold text-green-deep disabled:opacity-70"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> Add medication
        </button>
      </form>
    </div>
  );
}
