import { NavLink, Outlet } from "react-router-dom";
import { Home, Weight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnline } from "@/lib/useOnline";

const tabs = [
  { to: "/", label: "Today", icon: Home, end: true },
  { to: "/weight", label: "Weight", icon: Weight },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function AppLayout() {
  const online = useOnline();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      {!online && (
        <div className="sticky top-0 z-50 bg-surface-soft px-4 py-2 text-center text-xs text-ink-soft">
          You're offline — logs are saved locally and will sync when you reconnect.
        </div>
      )}

      <main className="flex-1 px-[22px] pb-28 pt-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-line bg-white/95 backdrop-blur">
        <div
          className="grid grid-cols-3 px-6 pt-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
        >
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1.5 text-[11px]",
                  isActive ? "font-semibold text-primary" : "font-medium text-ink-faint",
                )
              }
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
