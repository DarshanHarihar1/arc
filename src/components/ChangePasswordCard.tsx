import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

// Lets a signed-in user set a new password — also the landing spot after opening
// a password-reset link (which signs them in with a recovery session).
export function ChangePasswordCard() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setStatus("saving");
    setError(null);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error);
      setStatus("idle");
      return;
    }
    setPassword("");
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-3">
        <p className="font-semibold">Change password</p>
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 8 characters"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={status === "saving" || password.length === 0}>
          {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
