import { QueryClient } from "@tanstack/react-query";

// A Dexie-backed persister is added in Phase 2 so reads survive reload/offline.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
