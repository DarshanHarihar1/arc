import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function Steps() {
  const { upsert } = useLog();
  const day = todayStr();
  const [value, setValue] = useState("");

  const todayRow = useLiveQuery(() => db.steps_log.where("day").equals(day).first(), [day]);

  // Reflect the stored value once it loads.
  useEffect(() => {
    if (todayRow) setValue(String(todayRow.steps));
  }, [todayRow?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const steps = Number(value);
    if (!Number.isFinite(steps) || steps < 0) return;
    await upsert("steps_log", {
      id: todayRow?.id ?? newId(),
      day,
      steps,
      created_at: todayRow?.created_at ?? new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Steps today</h1>
      <Card>
        <form onSubmit={save} className="space-y-3">
          <Field label="Step count">
            <Input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 8200"
            />
          </Field>
          <Button type="submit" className="w-full">
            {todayRow ? "Update" : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
