import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { flushOutbox } from "@/sync/outbox";
import { pullAll } from "@/sync/pull";

// Wires the sync triggers from §4.7.4: online event, app foreground
// (visibilitychange), a periodic timer, and post-login. Each fires both halves —
// pull server rows down into the local store, and push pending local writes up.
function sync() {
  void pullAll();
  void flushOutbox();
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    sync(); // post-login / on mount

    const onOnline = () => sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const timer = window.setInterval(() => sync(), 30_000);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId]);

  return <>{children}</>;
}
