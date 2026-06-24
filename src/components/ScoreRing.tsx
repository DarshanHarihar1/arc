// Today's consistency score as a progress ring. Pure presentational — the score
// is computed upstream (lib/score) and cached on the daily_checkins row.
export function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - pct / 100);

  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`Score ${Math.round(score)}`}>
      <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" className="fill-foreground text-2xl font-semibold">
        {Math.round(score)}
      </text>
    </svg>
  );
}
