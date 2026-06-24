import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera } from "lucide-react";
import { db, type MealType } from "@/db/db";
import { useLog, newId } from "@/sync/useLog";
import { startOfTodayISO } from "@/lib/day";
import { useMealTemplates, useMealTemplateMutations } from "@/data/templates";
import { compressImage } from "@/lib/photo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogHeader, SectionLabel, Segmented } from "@/components/ui/kit";

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
    <div>
      <LogHeader title="log a meal" />

      {templates && templates.length > 0 && (
        <div className="mb-4">
          <button type="button" className="text-sm font-medium text-primary" onClick={() => setShowTemplates((v) => !v)}>
            {showTemplates ? "Hide templates" : `Use a template (${templates.length})`}
          </button>
          {showTemplates && (
            <div className="mt-2 space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex w-full items-center justify-between rounded-2xl border border-line bg-white p-3.5 text-left shadow-card"
                >
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs capitalize text-ink-faint">{t.meal}</p>
                  </div>
                  {t.calories && <span className="font-mono text-xs text-ink-soft">{t.calories}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={add}>
        <Segmented options={MEALS.map((m) => ({ value: m, label: m }))} value={meal} onChange={setMeal} />

        <label className="mb-1.5 mt-[18px] block text-[13px] font-medium text-ink-soft">what did you eat?</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. grilled chicken salad" />

        <label className="mb-1.5 mt-3.5 block text-[13px] font-medium text-ink-soft">
          calories <span className="font-normal text-ink-faint">· optional</span>
        </label>
        <div className="relative">
          <Input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="—"
            className="pr-12 font-mono"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-faint">kcal</span>
        </div>

        <label
          className="mt-3.5 flex min-h-[60px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#DDE2E7] bg-[#FAFBFC] text-ink-faint"
        >
          <Camera className="h-5 w-5" strokeWidth={1.7} />
          <span className="text-[13.5px]">{photoFile ? photoFile.name : "add photo"}</span>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        <Button type="submit" className="mt-[18px] h-[52px] w-full">Add meal</Button>
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={saveAsTemplate} disabled={!title.trim()}>
          Save as template
        </Button>
      </form>

      <SectionLabel className="mb-3 mt-7">today</SectionLabel>
      {today && today.length === 0 ? (
        <p className="text-sm text-ink-faint">No meals logged yet.</p>
      ) : (
        <div className="rounded-[18px] border border-line bg-white px-4 shadow-card">
          {today?.map((f, i) => (
            <div
              key={f.id}
              className={"flex items-center gap-3 py-3.5" + (i < (today.length - 1) ? " border-b border-line-soft" : "")}
            >
              <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[11px] font-semibold capitalize text-ink-soft">
                {f.meal}
              </span>
              <span className="flex-1 text-sm font-medium">{f.title}</span>
              {f.photo_path && <span className="text-xs text-ink-faint">📷</span>}
              {f.calories != null && <span className="font-mono text-[13px] text-ink-soft">{f.calories}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
