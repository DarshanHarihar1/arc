import { defineConfig } from "vitest/config";

// The reminder-timing logic is pure TS shared by the edge function and these
// tests, so a plain Node environment is all we need.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
  },
});
