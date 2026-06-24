import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MealType } from "@/db/db";

// Templates are configuration-style data (like medications): server-direct via
// TanStack Query; not queued in the offline outbox. use_count is incremented
// server-side on each use.

// ---- Meal templates --------------------------------------------------------

export interface MealTemplate {
  id: string;
  user_id: string;
  meal: MealType | null;
  title: string;
  notes: string | null;
  calories: number | null;
  use_count: number;
}

const MEAL_KEY = ["meal_templates"];

export function useMealTemplates() {
  return useQuery({
    queryKey: MEAL_KEY,
    queryFn: async (): Promise<MealTemplate[]> => {
      const { data, error } = await supabase
        .from("meal_templates")
        .select("id,user_id,meal,title,notes,calories,use_count")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MealTemplate[];
    },
  });
}

export function useMealTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: MEAL_KEY });

  const save = useMutation({
    mutationFn: async (t: Omit<MealTemplate, "user_id" | "use_count"> & { user_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = { ...t, user_id: t.user_id ?? auth.user?.id, use_count: 0 };
      const { error } = await supabase.from("meal_templates").upsert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const use = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("increment_meal_template_use", { template_id: id });
      // Increment via direct update if RPC not available (simpler for now).
      if (error) {
        const { data } = await supabase
          .from("meal_templates")
          .select("use_count")
          .eq("id", id)
          .single();
        await supabase
          .from("meal_templates")
          .update({ use_count: (data?.use_count ?? 0) + 1 })
          .eq("id", id);
      }
    },
    onSuccess: invalidate,
  });

  return { save, remove, use };
}

// ---- Workout templates -----------------------------------------------------

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  exercises: Array<{ name: string; sets?: number; reps?: number; weight_kg?: number }> | null;
  use_count: number;
}

const WORKOUT_KEY = ["workout_templates"];

export function useWorkoutTemplates() {
  return useQuery({
    queryKey: WORKOUT_KEY,
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id,user_id,name,type,exercises,use_count")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutTemplate[];
    },
  });
}

export function useWorkoutTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: WORKOUT_KEY });

  const save = useMutation({
    mutationFn: async (t: Omit<WorkoutTemplate, "user_id" | "use_count"> & { user_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = { ...t, user_id: t.user_id ?? auth.user?.id, use_count: 0 };
      const { error } = await supabase.from("workout_templates").upsert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const use = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("increment_workout_template_use", { template_id: id });
      if (error) {
        const { data } = await supabase
          .from("workout_templates")
          .select("use_count")
          .eq("id", id)
          .single();
        await supabase
          .from("workout_templates")
          .update({ use_count: (data?.use_count ?? 0) + 1 })
          .eq("id", id);
      }
    },
    onSuccess: invalidate,
  });

  return { save, remove, use };
}
