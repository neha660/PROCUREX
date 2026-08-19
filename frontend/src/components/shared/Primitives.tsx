import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AuthorisationStatus } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  AUTO_APPROVED: { label: "Auto-approved", cls: "bg-success-soft text-success border-success/20" },
  ESCALATED: { label: "Escalated", cls: "bg-danger-soft text-danger border-danger/20" },
  REJECTED: { label: "Rejected", cls: "bg-danger-soft text-danger border-danger/20" },
  PENDING_ESCALATION: { label: "Escalated", cls: "bg-danger-soft text-danger border-danger/20" },
  PURCHASE_CONFIRMED_MOCK: {
    label: "Purchase confirmed",
    cls: "bg-success-soft text-success border-success/20",
  },
  Draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  Discovering: { label: "Discovering", cls: "bg-warning-soft text-warning border-warning/20" },
  Evaluating: { label: "Evaluating", cls: "bg-warning-soft text-warning border-warning/20" },
  Ready: { label: "Ready", cls: "bg-success-soft text-success border-success/20" },
  Purchased: { label: "Purchased", cls: "bg-success-soft text-success border-success/20" },
  Escalated: { label: "Escalated", cls: "bg-danger-soft text-danger border-danger/20" },
  Passed: { label: "Passed", cls: "bg-success-soft text-success border-success/20" },
  Failed: { label: "Failed", cls: "bg-danger-soft text-danger border-danger/20" },
  "Needs review": { label: "Needs review", cls: "bg-warning-soft text-warning border-warning/20" },
};

/** Status is always conveyed by icon glyph + text label, never colour alone. */
export function StatusPill({
  status,
  className,
}: {
  status: AuthorisationStatus | string;
  className?: string;
}) {
  const m = STATUS_MAP[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  const isGood = m.cls.includes("success");
  const isBad = m.cls.includes("danger");
  const glyph = isGood ? "✓" : isBad ? "✕" : "•";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide whitespace-nowrap",
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
    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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
    <div className={cn("mb-5", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground mt-1">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{sub}</p>}
    </div>
  );
}

export function Metric({
  label,
  value,
  accent = "text-foreground",
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={cn("font-display text-xl md:text-[1.65rem] font-semibold tabular-nums truncate", accent)}>
        {value}
      </span>
      <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      {hint && <span className="text-[11px] text-ink-faint truncate">{hint}</span>}
    </div>
  );
}
