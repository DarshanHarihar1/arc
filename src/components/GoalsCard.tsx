import { useEffect, useState } from "react";
import { useProfile, useProfileMutation } from "@/data/profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const TZ_OPTIONS = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function GoalsCard() {
  const { data: profile } = useProfile();
  const mutation = useProfileMutation();

  const [stepGoal, setStepGoal] = useState("");
  const [waterGoal, setWaterGoal] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setStepGoal(String(profile.step_goal));
    setWaterGoal(String(profile.water_goal_ml));
    setTimezone(profile.timezone);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await mutation.mutateAsync({
      step_goal: stepGoal ? Number(stepGoal) : 8000,
      water_goal_ml: waterGoal ? Number(waterGoal) : 3000,
      timezone,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-3">
        <p className="font-medium">Goals</p>
        <Field label="Daily step goal">
          <Input
            type="number"
            inputMode="numeric"
            value={stepGoal}
            onChange={(e) => setStepGoal(e.target.value)}
            placeholder="8000"
          />
        </Field>
        <Field label="Daily water goal (ml)">
          <Input
            type="number"
            inputMode="numeric"
            value={waterGoal}
            onChange={(e) => setWaterGoal(e.target.value)}
            placeholder="3000"
          />
        </Field>
        <Field label="Timezone">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TZ_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {saved ? "Saved" : mutation.isPending ? "Saving…" : "Save goals"}
        </Button>
      </form>
    </Card>
  );
}
