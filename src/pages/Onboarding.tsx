import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { useIsStandalone } from "@/lib/usePwaDisplayMode";

export function Onboarding() {
  const { session, signInWithEmail } = useAuth();
  const standalone = useIsStandalone();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Already signed in -> straight to the app.
  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setError(error);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Arc</h1>
        <p className="text-sm text-muted-foreground">
          Stay consistent with workouts, food, medicine, and steps.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-medium">Sign in</h2>
        {status === "sent" ? (
          <p className="text-sm text-muted-foreground">
            Check your email for a magic link. Open it on this device to finish signing in.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" className="w-full" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Email me a magic link"}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-medium">Add to Home Screen</h2>
        {standalone ? (
          <p className="text-sm text-primary">✓ Installed — you’re running the app.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open this page in Safari on your iPhone.</li>
            <li>Tap the Share button, then “Add to Home Screen”.</li>
            <li>Open Arc from the new home-screen icon.</li>
          </ol>
        )}
        <p className="text-xs text-muted-foreground">
          Installing is required for reminders to reach you on iOS (16.4+).
        </p>
      </Card>
    </div>
  );
}
