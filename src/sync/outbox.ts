import { db } from "@/db/db";
import { supabase } from "@/lib/supabase";

// Strip client-only fields (anything prefixed with "_") before sending to Postgres.
function toServerRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    if (!k.startsWith("_")) out[k] = row[k];
  }
  return out;
}

let flushing = false;

// FIFO drain of the outbox (§4.7.4). PK is the client-generated UUID, so upserts
// are idempotent — re-running a flush never duplicates rows.
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    const items = await db.outbox.orderBy("seq").toArray();
    for (const item of items) {
      try {
        if (item.op === "delete") {
          const { error } = await supabase.from(item.table).delete().eq("id", item.id);
          if (error) throw error;
        } else {
          const row = await db.table(item.table).get(item.id);
          if (!row) {
            // Row was deleted locally before it synced; drop the stale upsert.
            await db.outbox.delete(item.seq!);
            continue;
          }
          const { error } = await supabase
            .from(item.table)
            .upsert(toServerRow(row as Record<string, unknown>));
          if (error) throw error;
          await db.table(item.table).update(item.id, { _dirty: 0 });
        }
        await db.outbox.delete(item.seq!);
      } catch (err) {
        const e = err as { status?: number; code?: string } | null;
        // Expired/invalid JWT: refresh and stop; the next flush resumes from this item.
        if (e?.status === 401 || e?.status === 403 || e?.code === "PGRST301") {
          await supabase.auth.refreshSession();
          break;
        }
        // Any other server-side rejection (a PostgREST/Postgres error code is present) is
        // deterministic — retrying the identical payload will fail forever and would wedge
        // the FIFO queue behind it. Drop the poison item so the rest drains; the row stays
        // in Dexie (still _dirty), surfaced locally rather than lost silently.
        if (e?.code) {
          await db.outbox.delete(item.seq!);
          continue;
        }
        // Transient (offline / network / 5xx without a code): stop and retry later.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

// Debounced trigger used after local writes.
let pending: ReturnType<typeof setTimeout> | null = null;
export function scheduleFlush(delay = 250): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void flushOutbox();
  }, delay);
}
