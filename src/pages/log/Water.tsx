import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const QUICK_AMOUNTS = [150, 250, 350, 500];
const GOAL_ML = 3000;

export function Water() {
  const { upsert } = useLog();
  const day = todayStr();

  const entries = useLiveQuery(() => db.water_log.where("day").equals(day).toArray(), [day]);
  const total = (entries ?? []).reduce((sum, e) => sum + e.amount_ml, 0);
  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100));

  async function add(ml: number) {
    const now = new Date().toISOString();
    await upsert("water_log", {
      id: newId(),
      logged_at: now,
      created_at: now,
      day,
      amount_ml: ml,
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Water</h1>

      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{total} ml</p>
            <p className="text-xs text-muted-foreground">of {GOAL_ML} ml goal ({pct}%)</p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((ml) => (
            <Button key={ml} variant="outline" onClick={() => add(ml)}>
              +{ml}
            </Button>
          ))}
        </div>
      </Card>

      {entries && entries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm text-muted-foreground">Today's entries</h2>
          {[...entries].reverse().map((e) => (
            <Card key={e.id} className="flex items-center justify-between py-3">
              <span className="text-sm">{e.amount_ml} ml</span>
              <span className="text-xs text-muted-foreground">
                {new Date(e.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
