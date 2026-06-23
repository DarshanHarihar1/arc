import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { MedicationsManager } from "@/components/MedicationsManager";

export function Settings() {
  const { signOut } = useAuth();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card className="space-y-1">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="text-sm">{email ?? "…"}</p>
      </Card>
      <MedicationsManager />

      <Card className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Goals, reminders, and notifications are added in later phases.
        </p>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}
