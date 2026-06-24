import Dexie, { type Table } from "dexie";

// Local-first store. Rows mirror the Postgres columns (§4.1) plus a client-only
// `_dirty` flag. Any key starting with "_" is stripped before upserting to the
// server (see sync/outbox.ts), so client-only fields are safe to keep here.

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DoseStatus = "taken" | "skipped" | "pending";

export interface FoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal: MealType;
  title: string;
  notes?: string | null;
  calories?: number | null;
  photo_path?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: number;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  logged_at: string;
  workout_day: string;
  type?: string | null;
  duration_min?: number | null;
  notes?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: number;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  user_id: string;
  name: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  position: number;
  _dirty?: number;
}

export interface MedicationLog {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_for: string;
  status: DoseStatus;
  acted_at?: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: number;
}

export interface StepsLog {
  id: string;
  user_id: string;
  day: string;
  steps: number;
  created_at: string;
  updated_at: string;
  _dirty?: number;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  day: string;
  workout_done?: boolean | null;
  meals_logged?: boolean | null;
  meds_taken?: boolean | null;
  steps_done?: boolean | null;
  water_done?: boolean | null;
  score?: number | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: number;
}

export type OutboxOp = "upsert" | "delete";

export interface OutboxItem {
  seq?: number;
  table: string;
  op: OutboxOp;
  id: string;
}

class AppDB extends Dexie {
  food_logs!: Table<FoodLog, string>;
  workout_logs!: Table<WorkoutLog, string>;
  workout_exercises!: Table<WorkoutExercise, string>;
  medication_logs!: Table<MedicationLog, string>;
  steps_log!: Table<StepsLog, string>;
  daily_checkins!: Table<DailyCheckin, string>;
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super("arc");
    this.version(1).stores({
      food_logs: "id, logged_at, _dirty",
      workout_logs: "id, workout_day, _dirty",
      workout_exercises: "id, workout_id, _dirty",
      medication_logs: "id, scheduled_for, status, medication_id, _dirty",
      steps_log: "id, day, _dirty",
      outbox: "++seq",
    });
    // Phase 4 adds the consistency check-in store.
    this.version(2).stores({
      daily_checkins: "id, day, _dirty",
    });
  }
}

export const db = new AppDB();
