import { supabase } from "@/lib/supabase";

// Client subscription flow (§4.5.3). Must be called from a user gesture so iOS
// allows the permission prompt. iOS only delivers push to a home-screen install.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) != null;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: "Push isn’t supported on this device/browser." };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: "Missing VITE_VAPID_PUBLIC_KEY in the build." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  // Everything past the permission grant can reject (the SW never becomes ready,
  // pushManager.subscribe is refused, the network is down). Catch it so the UI
  // always gets a result back instead of being left stuck after the prompt.
  try {
    // `serviceWorker.ready` never rejects — it just hangs if no SW ever activates
    // (e.g. registration silently failed). Race it with a timeout so "Turning on…"
    // can't get stuck forever, and the user sees a real error instead.
    const reg = await withTimeout(
      navigator.serviceWorker.ready,
      10_000,
      "The service worker didn’t start — reload the app and try again.",
    );

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Not signed in." };

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      },
    );
    if (!res.ok) {
      return { ok: false, error: `Couldn’t save subscription (${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn’t enable reminders.",
    };
  }
}

// Reject after `ms` so an await that would otherwise hang resolves into an error.
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ]);
}

// VAPID public key (URL-safe base64) -> ArrayBuffer for applicationServerKey.
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}
