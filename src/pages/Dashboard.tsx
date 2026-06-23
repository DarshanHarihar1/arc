import { Card } from "@/components/ui/card";

export function Dashboard() {
  // Phase 4 replaces this with the score ring, streaks, and quick-add.
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Your consistency dashboard lands here in a later phase.
        </p>
      </header>
      <Card>
        <p className="text-sm text-muted-foreground">
          Foundation is in place: you’re signed in and the app is installable. Logging
          arrives in Phase 2.
        </p>
      </Card>
    </div>
  );
}
