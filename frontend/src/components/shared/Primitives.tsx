import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AuthorisationStatus } from "@/lib/types";

const STATUS_MAP: Record<
  string,
  { label: string; cls: string }
> = {
  AUTO_APPROVED: { label: "Auto-approved", cls: "bg-sage/15 text-sage-hi border-sage/30" },
  ESCALATED: { label: "Escalated", cls: "bg-coral/15 text-coral-hi border-coral/30" },
  REJECTED: { label: "Rejected", cls: "bg-coral/15 text-coral-hi border-coral/30" },
  PENDING_ESCALATION: { label: "Escalated", cls: "bg-coral/15 text-coral-hi border-coral/30" },
  PURCHASE_CONFIRMED_MOCK: {
    label: "Purchase confirmed",
    cls: "bg-sage/15 text-sage-hi border-sage/30",
  },
  Draft: { label: "Draft", cls: "bg-ink-700 text-text-mid border-line" },
  Discovering: { label: "Discovering", cls: "bg-gold/15 text-gold-hi border-gold/30" },
  Evaluating: { label: "Evaluating", cls: "bg-gold/15 text-gold-hi border-gold/30" },
  Ready: { label: "Ready", cls: "bg-sage/15 text-sage-hi border-sage/30" },
  Purchased: { label: "Purchased", cls: "bg-sage/15 text-sage-hi border-sage/30" },
  Escalated: { label: "Escalated", cls: "bg-coral/15 text-coral-hi border-coral/30" },
  Passed: { label: "Passed", cls: "bg-sage/15 text-sage-hi border-sage/30" },
  Failed: { label: "Failed", cls: "bg-coral/15 text-coral-hi border-coral/30" },
  "Needs review": { label: "Needs review", cls: "bg-gold/15 text-gold-hi border-gold/30" },
};

/** Status is always conveyed by icon glyph + text label, never colour alone. */
export function StatusPill({
  status,
  className,
}: {
  status: AuthorisationStatus | string;
  className?: string;
}) {
  const m = STATUS_MAP[status] || { label: status, cls: "bg-ink-700 text-text-mid border-line" };
  const isGood = m.cls.includes("sage");
  const isBad = m.cls.includes("coral");
  const glyph = isGood ? "✓" : isBad ? "✕" : "•";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        m.cls,
        className
      )}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {glyph}
      </span>
      {m.label}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-2xl font-semibold text-text-hi mt-1">{title}</h2>
      {sub && <p className="text-sm text-text-mid mt-1.5 max-w-2xl">{sub}</p>}
    </div>
  );
}

export function Metric({
  label,
  value,
  accent = "text-text-hi",
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("font-display text-2xl md:text-3xl font-semibold", accent)}>
        {value}
      </span>
      <span className="text-xs text-text-dim">{label}</span>
      {hint && <span className="text-[11px] text-text-dim/80">{hint}</span>}
    </div>
  );
}
