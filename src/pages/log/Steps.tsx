import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { useProfile } from "@/data/profile";
import { Button } from "@/components/ui/button";
import { LogHeader } from "@/components/ui/kit";

export function Steps() {
  const { upsert } = useLog();
  const day = todayStr();
  const [value, setValue] = useState("");

  const { data: profile } = useProfile();
  const goal = profile?.step_goal ?? 8000;

  const todayRow = useLiveQuery(() => db.steps_log.where("day").equals(day).first(), [day]);

  // Reflect the stored value once it loads.
  useEffect(() => {
    if (todayRow) setValue(String(todayRow.steps));
  }, [todayRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = Number(value) || 0;
  const pct = Math.min(100, Math.round((steps / goal) * 100));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(steps) || steps < 0) return;
    await upsert("steps_log", {
      id: todayRow?.id ?? newId(),
      day,
      steps,
      created_at: todayRow?.created_at ?? new Date().toISOString(),
    });
  }

  return (
    <div>
      <LogHeader title="steps today" />

      <form onSubmit={save}>
        <div className="flex flex-col items-center rounded-[22px] border border-line bg-white px-5 pb-7 pt-9 shadow-card">
          <div className="text-[12px] font-semibold lowercase tracking-[0.07em] text-ink-mute">steps walked</div>
          <div className="mt-3 flex items-end gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-[3.5em] bg-transparent text-center font-mono text-[66px] font-medium leading-[0.9] tracking-[-0.04em] text-ink outline-none placeholder:text-[#C7CDD4]"
            />
            <span className="mb-1.5 h-12 w-0.5 animate-[arcpulse_1.1s_ease-in-out_infinite] bg-primary" />
          </div>
          <div className="mt-2.5 text-sm text-ink-faint">tap to edit today's count</div>
          <div className="mt-6 w-full">
            <div className="mb-2 flex justify-between text-[12.5px] text-ink-soft">
              <span>goal · <span className="font-mono">{goal.toLocaleString()}</span></span>
              <span className="font-mono font-medium text-primary">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#ECEFF2]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <Button type="submit" className="mt-[18px] h-[52px] w-full">
          {todayRow ? "Update steps" : "Save steps"}
        </Button>
        <p className="mt-3 text-center text-[12.5px] leading-relaxed text-ink-faint">
          One entry per day — this updates today's total.
        </p>
      </form>
    </div>
  );
}
