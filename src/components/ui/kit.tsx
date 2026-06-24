import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Round back button used at the top of pushed (log) screens.
export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label="Back"
      className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-line bg-white text-ink-soft"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}

// Pushed-screen header: back button above a large title.
export function LogHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <BackButton />
      <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}

// The arc brand mark — a calm green half-arc.
export function ArcMark({ size = 46, className }: { size?: number; className?: string }) {
  const h = Math.round((size * 26) / 46);
  return (
    <svg width={size} height={h} viewBox="0 0 46 26" fill="none" className={className} aria-hidden>
      <path d="M3 23 A20 20 0 0 1 43 23" stroke="#2E9E6B" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// Lowercase, letter-spaced overline used to head each section.
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[12px] font-semibold lowercase tracking-[0.07em] text-ink-mute", className)}>
      {children}
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

// Pill segmented control (meal type, energy, etc.).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 rounded-2xl bg-surface-soft p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[10px] py-2 text-center text-[13px] capitalize transition-colors",
              active
                ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                : "text-ink-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
