import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ReminderKind =
  | "medication"
  | "meal"
  | "workout_checkin"
  | "water"
  | "custom";

export interface Reminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  body: string | null;
  time_of_day: string; // "HH:MM" or "HH:MM:SS"
  days_of_week: number[]; // 0=Sun … 6=Sat
  deep_link: string | null;
  ref_id: string | null;
  active: boolean;
}

const KEY = ["reminders"];

// Reminders are configuration (like medications), so they live on the server and
// are cached by TanStack Query. The dispatcher fires them server-side.
export function useReminders() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await supabase
        .from("reminders")
        .select(
          "id,user_id,kind,title,body,time_of_day,days_of_week,deep_link,ref_id,active",
        )
        .order("time_of_day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });
}

export function useReminderMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const save = useMutation({
    mutationFn: async (
      r: Omit<Reminder, "user_id"> & { user_id?: string },
    ) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = { ...r, user_id: r.user_id ?? auth.user?.id };
      const { error } = await supabase.from("reminders").upsert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("reminders")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove, setActive };
}
