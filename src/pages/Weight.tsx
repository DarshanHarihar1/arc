import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { startOfWeek, subWeeks, format } from "date-fns";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { db } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";

const UNIT_KEY = "arc:weight-unit";

function thisSunday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 0 });
}

function sundayStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function sundayLabel(d: Date): string {
  return format(d, "EEE · MMM d").toLowerCase();
}

function toDisplay(kg: number | null | undefined, unit: "kg" | "lbs"): string {
  if (kg == null) return "";
  return unit === "lbs" ? (kg * 2.20462).toFixed(1) : kg.toFixed(1);
}

function toKg(value: string, unit: "kg" | "lbs"): number {
  const n = parseFloat(value);
  if (!isFinite(n) || n <= 0) return 0;
  return unit === "lbs" ? n / 2.20462 : n;
}

export function Weight() {
  const { upsert } = useLog();
  const sunday = thisSunday();
  const todayDay = sundayStr(sunday);

  const [unit, setUnit] = useState<"kg" | "lbs">(() =>
    (localStorage.getItem(UNIT_KEY) as "kg" | "lbs") ?? "kg",
  );
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  // Last 8 Sundays (newest first) for history and sparkline.
  const sundays = Array.from({ length: 8 }, (_, i) => sundayStr(subWeeks(sunday, i)));

  const allMetrics = useLiveQuery(() => db.body_metrics.toArray(), []);
  const byDay = new Map((allMetrics ?? []).map((r) => [r.day, r]));

  const thisRow = byDay.get(todayDay);
  const lastRow = byDay.get(sundays[1]);

  useEffect(() => {
    if (!thisRow || prefilled.current) return;
    prefilled.current = true;
    setInput(toDisplay(thisRow.weight_kg, unit));
  }, [thisRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUnitToggle(u: "kg" | "lbs") {
    const kg = toKg(input, unit);
    setUnit(u);
    localStorage.setItem(UNIT_KEY, u);
    if (kg > 0) setInput(toDisplay(kg, u));
  }

  const kg = toKg(input, unit);
  const hasValue = kg > 0;

  const delta =
    thisRow?.weight_kg != null && lastRow?.weight_kg != null
      ? thisRow.weight_kg - lastRow.weight_kg
      : null;

  async function save() {
    if (!hasValue) return;
    const now = new Date().toISOString();
    await upsert("body_metrics", {
      id: thisRow?.id ?? newId(),
      day: todayDay,
      weight_kg: kg,
      body_fat_pct: thisRow?.body_fat_pct ?? null,
      waist_cm: thisRow?.waist_cm ?? null,
      created_at: thisRow?.created_at ?? now,
    });
  }

  // Sparkline — oldest to newest, omit weeks with no data.
  const sparkData = sundays
    .slice()
    .reverse()
    .map((d) => ({ day: d, weight: byDay.get(d)?.weight_kg ?? null }))
    .filter((p) => p.weight != null);

  const isFilled = thisRow?.weight_kg != null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em]">weekly weight</h1>
        <p className="mt-[7px] text-sm text-ink-soft">{sundayLabel(sunday)}</p>
      </header>

      {/* Main weight card */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="cursor-text rounded-[24px] bg-white px-5 py-10 text-center shadow-card transition-all"
        style={
          isFilled
            ? {
                border: "1.5px solid #2E9E6B",
                boxShadow: "0 0 0 4px rgba(46,158,107,.08), 0 1px 3px rgba(16,24,40,.04)",
              }
            : { border: "1px solid #E8ECEF", boxShadow: "0 1px 3px rgba(16,24,40,.04)" }
        }
      >
        <div className="flex items-end justify-center gap-0">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="—"
            className="w-[4em] bg-transparent text-center font-mono text-[72px] font-bold leading-none tracking-[-0.04em] outline-none"
            style={{ color: hasValue ? "#1E2630" : "#DDE1E6" }}
          />
        </div>
        <div
          className="mt-1.5 text-base font-medium tracking-[0.03em]"
          style={{ color: hasValue ? "#5C6775" : "#C7CDD4" }}
        >
          {unit}
        </div>

        {delta != null && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-tint px-3.5 py-1.5">
            <span className="text-[12.5px] font-semibold text-green-deep">
              {delta > 0 ? "+" : ""}
              {unit === "lbs" ? (delta * 2.20462).toFixed(1) : delta.toFixed(1)} from last week
            </span>
          </div>
        )}

        <div className="mt-4 inline-flex gap-[3px] rounded-[10px] bg-surface-soft p-[3px]">
          {(["kg", "lbs"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleUnitToggle(u); }}
              className="rounded-[8px] px-[22px] py-[7px] text-[13px] transition-colors"
              style={
                unit === u
                  ? { background: "#fff", fontWeight: 600, color: "#1E2630", boxShadow: "0 1px 2px rgba(16,24,40,.07)" }
                  : { color: "#9AA3AF" }
              }
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {!isFilled && (
        <p className="text-center text-[13.5px] leading-relaxed text-[#B6BDC6]">
          step on the scale first thing in the morning,<br />then tap above to enter your reading
        </p>
      )}

      <button
        type="button"
        disabled={!hasValue}
        onClick={() => void save()}
        className="h-[52px] w-full rounded-[14px] text-base font-semibold transition-colors disabled:cursor-not-allowed"
        style={
          hasValue
            ? { background: "#2E9E6B", color: "#fff", boxShadow: "0 1px 2px rgba(20,80,50,.2)" }
            : { background: "#E8ECEF", color: "#C0C7D0" }
        }
      >
        {thisRow ? "update weight" : "save weight"}
      </button>

      {/* 8-week sparkline */}
      {sparkData.length > 1 && (
        <div className="rounded-[18px] border border-line bg-white px-[18px] pb-5 pt-4 shadow-card">
          <p className="mb-3.5 text-[11.5px] tracking-[0.04em] text-ink-faint">8-week trend</p>
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={sparkData}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E9E6B" stopOpacity={0.13} />
                  <stop offset="100%" stopColor="#2E9E6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="weight"
                dot={false}
                stroke="#2E9E6B"
                strokeWidth={2}
              />
              {sparkData.length > 0 && (
                <ReferenceDot
                  x={sparkData[sparkData.length - 1].day}
                  y={sparkData[sparkData.length - 1].weight as number}
                  r={4}
                  fill="#2E9E6B"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8ECEF" }}
                formatter={(v) => {
                  const n = typeof v === "number" ? v : 0;
                  return [`${unit === "lbs" ? (n * 2.20462).toFixed(1) : n.toFixed(1)} ${unit}`, ""];
                }}
                labelFormatter={(l) => {
                  try { return format(new Date(String(l)), "MMM d"); } catch { return String(l); }
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past 4 weeks */}
      <div>
        <div className="mb-3 text-[12px] font-semibold lowercase tracking-[0.07em] text-ink-mute">
          past 4 weeks
        </div>
        <div className="rounded-[18px] border border-line bg-white px-[18px] shadow-card">
          {sundays.slice(1, 5).map((d, i) => {
            const row = byDay.get(d);
            const displayVal = row?.weight_kg != null ? toDisplay(row.weight_kg, unit) : null;
            return (
              <div
                key={d}
                className={"flex items-center py-3.5" + (i < 3 ? " border-b border-line-soft" : "")}
              >
                <span className="flex-1 text-[14px]" style={{ color: displayVal ? "#1E2630" : "#C7CDD4" }}>
                  {format(new Date(d), "EEE MMM d").toLowerCase()}
                </span>
                <span
                  className="font-mono text-[14px]"
                  style={{ color: displayVal ? "#1E2630" : "#C7CDD4" }}
                >
                  {displayVal ? `${displayVal} ${unit}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
