import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr, prevDay } from "@/lib/day";
import { Button } from "@/components/ui/button";
import { SectionLabel, Segmented } from "@/components/ui/kit";

const MOODS = [
  { value: 1, label: "rough", color: "#EEF0F2" },
  { value: 2, label: "low", color: "#DEEAE3" },
  { value: 3, label: "okay", color: "#C4E0D0" },
  { value: 4, label: "good", color: "#2E9E6B" },
  { value: 5, label: "great", color: "#1C7A50" },
] as const;

type Energy = "low" | "steady" | "high";
const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
  { value: "low", label: "low" },
  { value: "steady", label: "steady" },
  { value: "high", label: "high" },
];

// Energy lives on the shared 1–5 scale (see log/Wellbeing) so both screens agree.
const energyToScore: Record<Energy, number> = { low: 2, steady: 3, high: 4 };
function scoreToEnergy(n: number | null | undefined): Energy {
  if (n == null) return "steady";
  return n < 3 ? "low" : n > 3 ? "high" : "steady";
}

export function Checkin() {
  const { upsert } = useLog();
  const navigate = useNavigate();
  const day = todayStr();
  const yesterday = prevDay(day);

  const [mood, setMood] = useState(4);
  const [energy, setEnergy] = useState<Energy>("steady");
  const [note, setNote] = useState("");
  const prefilled = useRef(false);

  const rows = useLiveQuery(() => db.wellbeing_log.where("day").equals(day).toArray(), [day]);
  const existing = rows?.[0];
  const yesterdayRow = useLiveQuery(
    () => db.wellbeing_log.where("day").equals(yesterday).first(),
    [yesterday],
  );

  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    if (existing.mood) setMood(existing.mood);
    setEnergy(scoreToEnergy(existing.energy));
    if (existing.notes) setNote(existing.notes);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    const now = new Date().toISOString();
    await upsert("wellbeing_log", {
      id: existing?.id ?? newId(),
      day,
      mood,
      energy: energyToScore[energy],
      sleep_hours: existing?.sleep_hours ?? null,
      notes: note.trim() || null,
      created_at: existing?.created_at ?? now,
    });
    navigate("/");
  }

  const dateLabel = format(new Date(), "EEEE, MMMM d").toLowerCase();

  return (
    <div>
      <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em]">check-in</h1>
      <p className="mt-[7px] text-sm text-ink-soft">{dateLabel} · a quiet minute for you</p>

      <SectionLabel className="mb-3.5 mt-6">how are you feeling?</SectionLabel>
      <div className="flex justify-between">
        {MOODS.map((m) => {
          const active = m.value === mood;
          const isGreen = m.value >= 4;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className="flex flex-col items-center gap-2.5"
            >
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-white transition-shadow"
                style={{
                  background: m.color,
                  boxShadow: active ? "0 0 0 3px #fff, 0 0 0 5.5px #2E9E6B" : undefined,
                }}
              >
                {active && isGreen && <Check className="h-[18px] w-[18px]" strokeWidth={2.4} />}
              </span>
              <span className={active ? "text-[11.5px] font-semibold text-green-deep" : "text-[11.5px] text-ink-faint"}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <SectionLabel className="mb-3 mt-7">energy</SectionLabel>
      <Segmented options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} />

      <SectionLabel className="mb-3 mt-7">anything on your mind?</SectionLabel>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="A line or two about your day…"
        className="min-h-24 w-full rounded-[14px] border border-input bg-white p-3.5 text-[14.5px] leading-relaxed text-[#3A434F] outline-none placeholder:text-ink-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
      />

      <Button className="mt-5 h-[52px] w-full" onClick={() => void submit()}>
        {existing ? "Update check-in" : "Save check-in"}
      </Button>

      {yesterdayRow && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[12.5px] text-ink-faint">
          yesterday
          <span className="inline-block h-[9px] w-[9px] rounded-full bg-primary" />
          {MOODS.find((m) => m.value === yesterdayRow.mood)?.label ?? "logged"} · {scoreToEnergy(yesterdayRow.energy)}
        </div>
      )}
    </div>
  );
}
