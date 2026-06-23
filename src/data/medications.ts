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

export function useMedicationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const save = useMutation({
    mutationFn: async (m: Omit<Medication, "user_id"> & { user_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = { ...m, user_id: m.user_id ?? auth.user?.id };
      const { error } = await supabase.from("medications").upsert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove };
}
