import { useEffect, useState } from "react";
import { enablePush, isSubscribed, permissionState } from "@/lib/push";
import { useIsStandalone } from "@/lib/usePwaDisplayMode";

// Push-reminders priming + permission flow, styled to arc.dc.html §09
// ("enable reminders · priming + system prompt"). The "Turn on reminders" tap is
// the §4.5.3 user gesture that triggers the iOS system permission dialog.

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="34" height="34" viewBox="0 0 24 24" fill="none">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const BENEFITS = [
  {
    text: "Dose reminders, one tap to mark taken",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="8" width="17" height="8" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    text: "Meal & water nudges at the right moments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 11h16M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    text: "An evening check-in to close your day",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 12 11 14.5 15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function NotificationsCard() {
  const standalone = useIsStandalone();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const perm = permissionState();

  useEffect(() => {
    void isSubscribed().then(setSubscribed);
  }, []);

  async function onEnable() {
    setBusy(true);
    setError(null);
    const { ok, error } = await enablePush();
    setBusy(false);
    if (ok) setSubscribed(true);
    else setError(error ?? "Couldn’t enable reminders.");
  }

  if (perm === "unsupported") {
    return (
      <div className="rounded-[20px] border border-[#E8ECEF] bg-white p-5 text-[#1E2630]">
        <p className="text-sm text-[#5C6775]">
          This browser doesn’t support push notifications.
        </p>
      </div>
    );
  }

  // Enabled → the green "notifications are on" banner from the reminders-manager design.
  if (subscribed) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] bg-[#EAF6EF] px-4 py-3 font-sans text-[#1E2630]">
        <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#2E9E6B] text-white">
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M2 7.5 5.5 11 12 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="flex-1 text-sm leading-snug text-[#1C7A50]">
          Notifications are on for this device.
        </p>
      </div>
    );
  }

  // Collapsed (user chose "maybe later") → a quiet re-entry point.
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="w-full rounded-[14px] border border-[#E8ECEF] bg-white px-4 py-3 text-left text-sm font-medium text-[#5C6775]"
      >
        Reminders are off — <span className="text-[#1C7A50]">turn them on</span>
      </button>
    );
  }

  return (
    <div className="rounded-[20px] border border-[#E8ECEF] bg-white p-6 font-sans text-[#1E2630]">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-[66px] w-[66px] items-center justify-center rounded-[20px] bg-[#2E9E6B] text-white shadow-[0_6px_18px_rgba(20,100,60,.28)]">
          <BellIcon />
          <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border-[2.5px] border-white bg-[#E0584C]" />
        </div>
        <h2 className="mt-5 text-[23px] font-bold tracking-tight">Never miss a dose</h2>
        <p className="mt-2.5 max-w-[280px] text-[14.5px] leading-relaxed text-[#5C6775]">
          Arc sends gentle, well-timed nudges so logging stays effortless and your
          streak keeps climbing.
        </p>
      </div>

      <div className="mt-7 rounded-[20px] border border-[#E8ECEF] px-[18px]">
        {BENEFITS.map((b, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-3.5 ${
              i < BENEFITS.length - 1 ? "border-b border-[#F1F3F5]" : ""
            }`}
          >
            <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#EAF6EF] text-[#2E9E6B]">
              {b.icon}
            </div>
            <p className="flex-1 text-sm leading-snug text-[#3A434F]">{b.text}</p>
          </div>
        ))}
      </div>

      {!standalone && (
        <p className="mt-4 text-[13px] leading-snug text-[#9AA3AF]">
          On iPhone, add Arc to your home screen first — push only works in the
          installed app (iOS 16.4+).
        </p>
      )}

      <div className="mt-6">
        <button
          onClick={onEnable}
          disabled={busy}
          className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#2E9E6B] text-base font-semibold text-white shadow-[0_1px_2px_rgba(20,80,50,.2)] disabled:opacity-70"
        >
          {busy ? "Turning on…" : "Turn on reminders"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="mt-3 w-full text-center text-[13.5px] text-[#9AA3AF]"
        >
          Maybe later
        </button>
      </div>

      {perm === "denied" && (
        <p className="mt-3 text-xs text-[#9AA3AF]">
          Notifications are blocked in your browser settings — allow them for this
          site, then try again.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-[#C0564B]">{error}</p>}
    </div>
  );
}
