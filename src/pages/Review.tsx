import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { LogHeader } from "@/components/ui/kit";

interface WeeklyReview {
  id: string;
  week_start: string;
  avg_score: number | null;
  summary: {
    days_logged: number;
    green_days: number;
    avg_score: number | null;
    workout_days: number;
  };
}

export function Review() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["weekly_reviews"],
    queryFn: async (): Promise<WeeklyReview[]> => {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("id,week_start,avg_score,summary")
        .order("week_start", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as WeeklyReview[];
    },
  });

  const latest = reviews[0];

  return (
    <div className="space-y-4">
      <LogHeader title="Weekly review" />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && !latest && (
        <Card className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No weekly reviews yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your first summary generates automatically on Sunday evening.
          </p>
        </Card>
      )}

      {latest && (
        <Card className="space-y-3">
          <p className="text-xs text-muted-foreground">Week of {latest.week_start}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-semibold tabular-nums">
                {latest.avg_score != null ? latest.avg_score : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Avg score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold tabular-nums">{latest.summary.green_days}</p>
              <p className="text-xs text-muted-foreground">Green days</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold tabular-nums">{latest.summary.days_logged}</p>
              <p className="text-xs text-muted-foreground">Days checked in</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold tabular-nums">{latest.summary.workout_days}</p>
              <p className="text-xs text-muted-foreground">Workout days</p>
            </div>
          </div>
        </Card>
      )}

      {reviews.slice(1).map((r) => (
        <Card key={r.id} className="flex items-center justify-between py-3">
          <p className="text-sm">Week of {r.week_start}</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{r.summary.green_days} green</span>
            <span className="font-medium tabular-nums">
              {r.avg_score != null ? r.avg_score : "—"}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
