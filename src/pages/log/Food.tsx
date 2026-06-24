import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type MealType } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { startOfTodayISO } from "@/lib/day";
import { useMealTemplates, useMealTemplateMutations } from "@/data/templates";
import { compressImage } from "@/lib/photo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function Food() {
  const { upsert } = useLog();
  const { session } = useAuth();
  const photoRef = useRef<HTMLInputElement>(null);
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [title, setTitle] = useState("");
  const [calories, setCalories] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: templates } = useMealTemplates();
  const { save: saveTemplate, use: useTemplate } = useMealTemplateMutations();

  const today = useLiveQuery(async () => {
    const rows = await db.food_logs.where("logged_at").aboveOrEqual(startOfTodayISO()).toArray();
    return rows.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();

    // Upload the photo if one was picked, but don't block the local write.
    let photoPath: string | null = null;
    if (photoFile && session?.user.id) {
      try {
        const compressed = await compressImage(photoFile);
        const path = `${session.user.id}/${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("meal-photos")
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (!error) photoPath = path;
      } catch {
        // Non-fatal: log the meal without the photo.
      }
    }

    await upsert("food_logs", {
      id: newId(),
      logged_at: now,
      created_at: now,
      meal,
      title: title.trim(),
      calories: calories ? Number(calories) : null,
      photo_path: photoPath,
    });
    setTitle("");
    setCalories("");
    setPhotoFile(null);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function saveAsTemplate() {
    if (!title.trim()) return;
    await saveTemplate.mutateAsync({
      id: newId(),
      meal,
      title: title.trim(),
      notes: null,
      calories: calories ? Number(calories) : null,
    });
  }

  function applyTemplate(t: NonNullable<typeof templates>[number]) {
    setMeal(t.meal ?? "snack");
    setTitle(t.title);
    setCalories(t.calories ? String(t.calories) : "");
    useTemplate.mutate(t.id);
    setShowTemplates(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Log a meal</h1>

      {templates && templates.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => setShowTemplates((v) => !v)}
          >
            {showTemplates ? "Hide templates" : `Use a template (${templates.length})`}
          </button>
          {showTemplates && (
            <div className="space-y-2">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="flex cursor-pointer items-center justify-between py-3"
                  onClick={() => applyTemplate(t)}
                >
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{t.meal}</p>
                  </div>
                  {t.calories && (
                    <span className="text-xs text-muted-foreground">{t.calories} kcal</span>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

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

          <Field label="Photo (optional)">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted-foreground"
            />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Add meal</Button>
            <Button type="button" variant="outline" onClick={saveAsTemplate} disabled={!title.trim()}>
              Save template
            </Button>
          </div>
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
            <div className="flex items-center gap-2">
              {f.photo_path && (
                <span className="text-xs text-muted-foreground">📷</span>
              )}
              {f.calories != null && (
                <span className="text-sm text-muted-foreground">{f.calories} kcal</span>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
