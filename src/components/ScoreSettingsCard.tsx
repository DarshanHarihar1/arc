import { useEffect, useState } from "react";
import { useProfile, useProfileMutation } from "@/data/profile";
import { CATEGORY_WEIGHTS, type Category } from "@/lib/score";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const ALL_CATEGORIES = Object.keys(CATEGORY_WEIGHTS) as Category[];

const LABELS: Record<Category, string> = {
  workout: "Workout (30 pts)",
  meals: "Meals (25 pts)",
  meds: "Medicines (25 pts)",
  steps: "Steps (10 pts)",
  water: "Water (10 pts)",
};

export function ScoreSettingsCard() {
  const { data: profile } = useProfile();
  const mutation = useProfileMutation();

  const [enabled, setEnabled] = useState<Set<Category>>(new Set(ALL_CATEGORIES));
  const [threshold, setThreshold] = useState("80");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEnabled(new Set(profile.enabled_categories));
    setThreshold(String(profile.green_threshold));
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(cat: Category) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await mutation.mutateAsync({
      enabled_categories: Array.from(enabled),
      green_threshold: threshold ? Number(threshold) : 80,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <p className="font-semibold">Consistency score</p>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Count toward score</p>
          {ALL_CATEGORIES.map((cat) => (
            <label key={cat} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={enabled.has(cat)}
                onChange={() => toggle(cat)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">{LABELS[cat]}</span>
            </label>
          ))}
        </div>

        <Field label="Green-day threshold (0–100)">
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="80"
          />
        </Field>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {saved ? "Saved" : mutation.isPending ? "Saving…" : "Save score settings"}
        </Button>
      </form>
    </Card>
  );
}
