import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { flushOutbox } from "@/sync/outbox";

// Wires the outbox flush triggers from §4.7.4: online event, app foreground
// (visibilitychange), a periodic timer, and post-login.
export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    void flushOutbox(); // post-login / on mount

    const onOnline = () => void flushOutbox();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flushOutbox();
    };
    const timer = window.setInterval(() => void flushOutbox(), 30_000);

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
