import { Card } from "@/components/ui/card";

// Stub for screens that are built out in later phases. Keeps routing/nav real
// while Phase 1 only proves auth + the installable shell.
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Card>
        <p className="text-sm text-muted-foreground">Coming in {phase}.</p>
      </Card>
    </div>
  );
}
