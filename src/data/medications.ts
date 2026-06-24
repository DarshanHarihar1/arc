import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DoseTime {
  time: string; // "HH:MM" local
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  schedule: DoseTime[];
  active: boolean;
}

const KEY = ["medications"];

// Medications are configuration, not a frictionless field log, so they live on
// the server (cached by TanStack Query for offline reads). Dose *logs* go through
// the offline outbox — see pages/log/Medicine.tsx.
export function useMedications() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase
        .from("medications")
        .select("id,user_id,name,dosage,schedule,active")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Medication[];
    },
  });
}

// A medication's schedule only produces notifications if it has matching rows in
// `reminders` — that's the table reminder-dispatch reads. Mirror the schedule into
// one daily `medication` reminder per dose time (ref_id ties them back to the med so
// the dispatcher pre-creates a pending dose for the one-tap Taken/Skip flow).
async function syncMedicationReminders(
  userId: string,
  med: Omit<Medication, "user_id">,
) {
  const { error: delErr } = await supabase
    .from("reminders")
    .delete()
    .eq("kind", "medication")
    .eq("ref_id", med.id);
  if (delErr) throw delErr;

  if (!med.active || med.schedule.length === 0) return;

  const rows = med.schedule.map((dose) => ({
    user_id: userId,
    kind: "medication",
    title: `${med.name} o'clock 💊`,
    body: "Your daily dose is calling — tap when it's done.",
    time_of_day: dose.time,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    deep_link: "/log/medicine",
    ref_id: med.id,
    active: true,
  }));
  const { error: insErr } = await supabase.from("reminders").insert(rows);
  if (insErr) throw insErr;
}

export function useMedicationMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["reminders"] });
  };

  const save = useMutation({
    mutationFn: async (m: Omit<Medication, "user_id"> & { user_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = m.user_id ?? auth.user?.id;
      if (!userId) throw new Error("Not signed in.");
      const payload = { ...m, user_id: userId };
      const { error } = await supabase.from("medications").upsert(payload);
      if (error) throw error;
      await syncMedicationReminders(userId, m);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: remErr } = await supabase
        .from("reminders")
        .delete()
        .eq("kind", "medication")
        .eq("ref_id", id);
      if (remErr) throw remErr;
      const { error } = await supabase.from("medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove };
}
