import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealType } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { startOfTodayISO } from "@/lib/day";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function Food() {
  const { upsert } = useLog();
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");

  const today = useLiveQuery(async () => {
    const rows = await db.food_logs.where("logged_at").aboveOrEqual(startOfTodayISO()).toArray();
    return rows.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();
    await upsert("food_logs", {
      id: newId(),
      logged_at: now,
      created_at: now,
      meal,
      title: title.trim(),
      calories: calories ? Number(calories) : null,
    });
    setTitle("");
    setCalories("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Log a meal</h1>

      <Card>
        <form onSubmit={add} className="space-y-3">
          <Field label="Meal">
            <div className="grid grid-cols-4 gap-2">
              {MEALS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={m === meal ? "default" : "outline"}
                  onClick={() => setMeal(m)}
                  className="capitalize"
                >
                  {m}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="What did you eat?">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Oats & eggs" />
          </Field>
          <Field label="Calories (optional)">
            <Input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="—"
            />
          </Field>
          <Button type="submit" className="w-full">Add meal</Button>
        </form>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm text-muted-foreground">Today</h2>
        {today && today.length === 0 && (
          <p className="text-sm text-muted-foreground">No meals logged yet.</p>
        )}
        {today?.map((f) => (
          <Card key={f.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{f.meal}</p>
            </div>
            {f.calories != null && (
              <span className="text-sm text-muted-foreground">{f.calories} kcal</span>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
