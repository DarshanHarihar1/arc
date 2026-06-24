import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { todayStr } from "@/lib/day";
import { compressImage } from "@/lib/photo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PhotoRow {
  id: string;
  taken_on: string;
  photo_path: string;
  notes: string | null;
}

const BUCKET = "progress-photos";
const MEAL_BUCKET = "meal-photos";
const SIGNED_URL_SECONDS = 3600;

const KEY = ["progress_photos"];
const MEAL_KEY = ["meal_photos"];

export function Photos() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: mealPhotos = [] } = useQuery({
    queryKey: MEAL_KEY,
    queryFn: async (): Promise<Array<{ id: string; logged_at: string; title: string; url: string }>> => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("id,logged_at,title,photo_path")
        .not("photo_path", "is", null)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (r) => {
          const { data: signed } = await supabase.storage
            .from(MEAL_BUCKET)
            .createSignedUrl(r.photo_path as string, SIGNED_URL_SECONDS);
          return { id: r.id, logged_at: r.logged_at, title: r.title, url: signed?.signedUrl ?? "" };
        }),
      );
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Array<PhotoRow & { url: string }>> => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("id,taken_on,photo_path,notes")
        .order("taken_on", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as PhotoRow[];

      // Batch signed URLs.
      return Promise.all(
        rows.map(async (r) => {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(r.photo_path, SIGNED_URL_SECONDS);
          return { ...r, url: signed?.signedUrl ?? "" };
        }),
      );
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Not authenticated");
      const compressed = await compressImage(file);
      const ext = "jpg";
      const path = `${userId}/${todayStr()}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { error: rowErr } = await supabase.from("progress_photos").insert({
        user_id: userId,
        taken_on: todayStr(),
        photo_path: path,
      });
      if (rowErr) throw rowErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => setError(e.message),
    onSettled: () => setUploading(false),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    upload.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Progress photos</h1>
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Add photo"}
        </Button>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {photos.length === 0 && !uploading && (
        <Card className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No progress photos yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Tap "Add photo" to capture one.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="space-y-1">
            {p.url && (
              <img
                src={p.url}
                alt={`Progress photo ${p.taken_on}`}
                className="aspect-square w-full rounded-lg object-cover"
              />
            )}
            <p className="text-xs text-muted-foreground text-center">{p.taken_on}</p>
          </div>
        ))}
      </div>

      {mealPhotos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Meal photos</h2>
          <div className="grid grid-cols-2 gap-3">
            {mealPhotos.map((p) => (
              <div key={p.id} className="space-y-1">
                {p.url && (
                  <img
                    src={p.url}
                    alt={p.title}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <p className="text-xs text-muted-foreground text-center truncate">{p.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
