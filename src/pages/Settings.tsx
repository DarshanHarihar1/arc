import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { MedicationsManager } from "@/components/MedicationsManager";
import { NotificationsCard } from "@/components/NotificationsCard";
import { RemindersManager } from "@/components/RemindersManager";
import { GoalsCard } from "@/components/GoalsCard";
import { ScoreSettingsCard } from "@/components/ScoreSettingsCard";
import { SectionLabel } from "@/components/ui/kit";

const MORE_LINKS = [
  { to: "/progress", label: "Progress & body metrics" },
  { to: "/photos", label: "Progress photos" },
  { to: "/review", label: "Weekly review" },
  { to: "/log/water", label: "Water log" },
  { to: "/log/wellbeing", label: "Wellbeing & sleep" },
];

export function Settings() {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? "…";
  const initial = (email !== "…" ? email : "?").trim().charAt(0).toUpperCase();

  return (
    <div>
      <h1 className="text-[30px] font-bold leading-none tracking-[-0.035em]">settings</h1>

      <SectionLabel className="mb-3 mt-6">account</SectionLabel>
      <div className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-tint text-base font-semibold text-green-deep">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-faint">Signed in as</p>
          <p className="mt-px truncate text-[15px] font-semibold">{email}</p>
        </div>
        <span className="flex-none rounded-full bg-surface-soft px-2.5 py-1 text-[11px] text-ink-soft">password</span>
      </div>

      <SectionLabel className="mb-3 mt-6">medications</SectionLabel>
      <MedicationsManager />

      <SectionLabel className="mb-3 mt-6">reminders</SectionLabel>
      <div className="space-y-4">
        <NotificationsCard />
        <RemindersManager />
      </div>

      <SectionLabel className="mb-3 mt-6">goals &amp; score</SectionLabel>
      <div className="space-y-4">
        <GoalsCard />
        <ScoreSettingsCard />
      </div>

      <SectionLabel className="mb-3 mt-6">more</SectionLabel>
      <div className="rounded-[18px] border border-line bg-white px-4 shadow-card">
        {MORE_LINKS.map((l, i) => (
          <Link
            key={l.to}
            to={l.to}
            className={"flex items-center gap-3 py-[15px]" + (i < MORE_LINKS.length - 1 ? " border-b border-line-soft" : "")}
          >
            <span className="flex-1 text-[14.5px] text-ink-soft">{l.label}</span>
            <ChevronRight className="h-4 w-4 text-ink-faint" strokeWidth={1.8} />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[13px] border border-line bg-white text-[15px] font-semibold text-danger"
      >
        Sign out
      </button>
    </div>
  );
}
