import { db } from "@/db/db";
import { useAuth } from "@/auth/AuthProvider";
import { scheduleFlush } from "@/sync/outbox";

// Local-first writes: persist to Dexie + enqueue an outbox op in one transaction,
// then nudge a background flush. The UI reads from Dexie (useLiveQuery), so it
// updates the instant the local write lands — never blocked on the network.
export function useLog() {
  const { session } = useAuth();
  const userId = session?.user.id;

  async function upsert(
    table: string,
    row: Record<string, unknown> & { id: string; user_id?: string },
  ): Promise<void> {
    if (!userId) throw new Error("Not authenticated");
    const full = {
      ...row,
      user_id: row.user_id ?? userId,
      updated_at: new Date().toISOString(),
      _dirty: 1,
    };
    await db.transaction("rw", db.table(table), db.outbox, async () => {
      await db.table(table).put(full);
      await db.outbox.add({ table, op: "upsert", id: row.id });
    });
    scheduleFlush();
  }

  async function remove(table: string, id: string): Promise<void> {
    await db.transaction("rw", db.table(table), db.outbox, async () => {
      await db.table(table).delete(id);
      await db.outbox.add({ table, op: "delete", id });
    });
    scheduleFlush();
  }

  return { userId, upsert, remove };
}

export function newId(): string {
  return crypto.randomUUID();
}
