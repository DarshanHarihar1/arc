import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export function RouteGuard() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Unauthenticated users are routed to onboarding (install + sign in).
  if (!session) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
