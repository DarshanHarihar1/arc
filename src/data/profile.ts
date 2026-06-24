import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/score";

export interface Profile {
  id: string;
  display_name: string | null;
  timezone: string;
  step_goal: number;
  water_goal_ml: number;
  enabled_categories: Category[];
  green_threshold: number;
}

const KEY = ["profile"];

export function useProfile() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,timezone,step_goal,water_goal_ml,enabled_categories,green_threshold")
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, "id">>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
