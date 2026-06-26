import { db } from "@/db/db";
import { supabase } from "@/lib/supabase";

// The missing half of the local-first sync. outbox.ts only pushes local writes
// up to Postgres; this pulls server rows back down so any device — not just the
// one that wrote a row — shows the full account. RLS scopes every select to the
// signed-in user, so a bare select returns only their rows.
const TABLES = [
  "food_logs",
  "workout_logs",
  "workout_exercises",
  "medication_logs",
  "steps_log",
  "water_log",
  "body_metrics",
  "wellbeing_log",
  "daily_checkins",
] as const;

let pulling = false;

export async function pullAll(): Promise<void> {
  if (pulling) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  pulling = true;
  try {
    for (const table of TABLES) {
      const { data, error, status } = await supabase.from(table).select("*");
      if (error) {
        // Expired/invalid JWT: refresh so the next trigger can resume.
        if (status === 401 || status === 403 || error.code === "PGRST301") {
          await supabase.auth.refreshSession();
        }
        continue;
      }
      const rows = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
      if (!rows.length) continue;
      await db.transaction("rw", db.table(table), async () => {
        for (const row of rows) {
          const local = (await db.table(table).get(row.id)) as { _dirty?: number } | undefined;
          // Don't clobber a local edit that hasn't been pushed yet; the outbox
          // owns that row until its flush succeeds.
          if (local?._dirty) continue;
          await db.table(table).put({ ...row, _dirty: 0 });
        }
      });
    }
  } finally {
    pulling = false;
  }
}
