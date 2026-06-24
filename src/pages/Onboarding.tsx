import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArcMark, SectionLabel } from "@/components/ui/kit";
import { useAuth } from "@/auth/AuthProvider";
import { useIsStandalone } from "@/lib/usePwaDisplayMode";

type Mode = "signin" | "signup" | "forgot";

const COPY: Record<Mode, { overline: string; cta: string; busy: string }> = {
  signin: { overline: "sign in", cta: "Sign in", busy: "Signing in…" },
  signup: { overline: "create account", cta: "Create account", busy: "Creating…" },
  forgot: { overline: "reset password", cta: "Send reset link", busy: "Sending…" },
};

function InstallSteps({ standalone }: { standalone: boolean }) {
  return (
    <div className="mt-8">
      <SectionLabel className="mb-3">add to home screen</SectionLabel>
      {standalone ? (
        <div className="rounded-[18px] border border-line bg-white p-4 text-sm font-medium text-green-deep">
          ✓ Installed — you're running the app.
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-[18px]">
          <Step n={1}>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              tap the share button
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-tint text-primary">
                <Share className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
            </span>
          </Step>
          <div className="h-px bg-line-soft" />
          <Step n={2}>
            scroll and tap <span className="font-semibold text-ink">"add to home screen"</span>
          </Step>
          <div className="h-px bg-line-soft" />
          <Step n={3}>
            tap <span className="font-semibold text-ink">add</span> — arc lands on your home screen
          </Step>
        </div>
      )}
      <div className="mt-3 rounded-xl bg-tint px-3.5 py-2.5 text-[12.5px] leading-relaxed text-green-deep">
        Installing is required for daily reminders to reach you on iOS (16.4+).
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-surface-soft font-mono text-[13px] font-semibold text-ink-soft">
        {n}
      </div>
      <div className="text-sm leading-snug text-[#3A434F]">{children}</div>
    </div>
  );
}

export function Onboarding() {
  const { session, signIn, signUp, resetPassword } = useAuth();
  const standalone = useIsStandalone();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Whether the "reset link sent" confirmation screen is showing.
  const [sent, setSent] = useState(false);

  // Already signed in -> straight to the app.
  if (session) return <Navigate to="/" replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setStatus("idle");
    setPassword("");
  }

  async function submit() {
    setStatus("sending");
    setError(null);

    if (mode === "forgot") {
      const { error } = await resetPassword(email.trim());
      if (error) return fail(error);
      setSent(true);
      return;
    }
    // Sign up and sign in both land a session, so the Navigate above takes over.
    const { error } =
      mode === "signup" ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    if (error) return fail(error);
    setStatus("idle");
  }

  function fail(message: string) {
    setError(message);
    setStatus("error");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  const copy = COPY[mode];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas px-6 pb-12 pt-16">
      <div className="mt-4 flex flex-col items-center gap-4 text-center">
        <ArcMark size={58} />
        <div className="text-[38px] font-bold leading-none tracking-[-0.05em]">arc</div>
        {!sent && (
          <p className="max-w-[268px] text-[15px] leading-relaxed text-ink-soft">
            Stay consistent with workouts, food, medicine, and steps.
          </p>
        )}
      </div>

      {sent ? (
        <div className="mt-9 flex flex-col items-center rounded-[20px] border border-line bg-white p-7 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint text-primary">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-4 text-[21px] font-bold tracking-tight">Check your inbox</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
            We sent a reset link to <span className="font-semibold text-ink">{email}</span>. Open it
            on this device, then set a new password from Settings.
          </p>
          <button
            type="button"
            className="mt-5 text-[12.5px] text-ink-faint"
            onClick={() => {
              setSent(false);
              switchMode("signin");
            }}
          >
            Back to <span className="font-semibold text-primary">sign in</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-9 rounded-[20px] border border-line bg-white p-[22px] shadow-card"
        >
          <SectionLabel>{copy.overline}</SectionLabel>

          <label className="mt-2 block text-[13px] text-ink-faint">Email</label>
          <input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-[50px] w-full rounded-xl border border-input bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />

          {mode !== "forgot" && (
            <>
              <div className="mt-3.5 flex items-center justify-between">
                <label className="block text-[13px] text-ink-faint">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-[12.5px] font-semibold text-primary"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "at least 8 characters" : "your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-[50px] w-full rounded-xl border border-input bg-white px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </>
          )}

          <Button type="submit" className="mt-3.5 h-[52px] w-full" disabled={status === "sending"}>
            {status === "sending" ? (
              <>
                <span className="inline-block h-[18px] w-[18px] animate-[arcspin_0.7s_linear_infinite] rounded-full border-[2.4px] border-white/40 border-t-white" />
                {copy.busy}
              </>
            ) : (
              copy.cta
            )}
          </Button>

          {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

          <div className="mt-4 text-center text-[12.5px] text-ink-faint">
            {mode === "signin" ? (
              <>
                New to arc?{" "}
                <button type="button" className="font-semibold text-primary" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="font-semibold text-primary" onClick={() => switchMode("signin")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <InstallSteps standalone={standalone} />
    </div>
  );
}
