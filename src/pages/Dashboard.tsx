import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

const quickLinks = [
  { to: "/log/food", label: "Meal" },
  { to: "/log/workout", label: "Workout" },
  { to: "/log/medicine", label: "Medicine" },
  { to: "/log/steps", label: "Steps" },
];

export function Dashboard() {
  // Phase 4 replaces this with the score ring, streaks, and a richer quick-add.
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Your consistency score and streaks land here in Phase 4.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="flex h-20 items-center justify-center text-sm font-medium">
              {q.label}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
