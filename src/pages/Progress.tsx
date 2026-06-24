import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { todayStr } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function Progress() {
  const { upsert } = useLog();
  const day = todayStr();

  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const prefilled = useRef(false);

  const allMetrics = useLiveQuery(
    () => db.body_metrics.orderBy("day").toArray(),
    [],
  );
  const todayRow = allMetrics?.find((r) => r.day === day);

  useEffect(() => {
    if (!todayRow || prefilled.current) return;
    prefilled.current = true;
    if (todayRow.weight_kg) setWeight(String(todayRow.weight_kg));
    if (todayRow.body_fat_pct) setBodyFat(String(todayRow.body_fat_pct));
    if (todayRow.waist_cm) setWaist(String(todayRow.waist_cm));
  }, [todayRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    await upsert("body_metrics", {
      id: todayRow?.id ?? newId(),
      day,
      weight_kg: weight ? Number(weight) : null,
      body_fat_pct: bodyFat ? Number(bodyFat) : null,
      waist_cm: waist ? Number(waist) : null,
      created_at: todayRow?.created_at ?? now,
    });
  }

  // Keep last 60 days that have weight data for the chart.
  const chartData = (allMetrics ?? [])
    .filter((r) => r.weight_kg != null)
    .slice(-60)
    .map((r) => ({ day: r.day.slice(5), weight: r.weight_kg }));

  // Score trend — read from daily_checkins.
  const checkins = useLiveQuery(() => db.daily_checkins.orderBy("day").toArray(), []);
  const scoreTrend = (checkins ?? [])
    .filter((r) => r.score != null)
    .slice(-30)
    .map((r) => ({ day: r.day.slice(5), score: r.score }));

  // Steps trend.
  const stepsAll = useLiveQuery(() => db.steps_log.orderBy("day").toArray(), []);
  const stepsTrend = (stepsAll ?? [])
    .slice(-30)
    .map((r) => ({ day: r.day.slice(5), steps: r.steps }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Progress</h1>

      <Card>
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm font-medium">Today's body metrics</p>
          <Field label="Weight (kg)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 72.5"
            />
          </Field>
          <Field label="Body fat %">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="optional"
            />
          </Field>
          <Field label="Waist (cm)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder="optional"
            />
          </Field>
          <Button type="submit" className="w-full">
            {todayRow ? "Update" : "Save"}
          </Button>
        </form>
      </Card>

      {chartData.length > 1 && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Weight trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {scoreTrend.length > 1 && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Consistency score (30 days)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stepsTrend.length > 1 && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Steps (30 days)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={stepsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="steps" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {chartData.length === 0 && scoreTrend.length === 0 && stepsTrend.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Trends appear after a few days of logging.
        </p>
      )}
    </div>
  );
}
