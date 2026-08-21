import { Sparkles, Lock } from "lucide-react";

export function StatusPill({ status }) {
  const map = {
    AUTO_APPROVED: { label: "Auto-approved", cls: "bg-success-50 text-success-700 ring-success-600/15" },
    ESCALATED: { label: "Escalated", cls: "bg-danger-50 text-danger-700 ring-danger-600/15" },
    REJECTED: { label: "Rejected", cls: "bg-danger-50 text-danger-700 ring-danger-600/15" },
    PENDING_ESCALATION: { label: "Escalated", cls: "bg-danger-50 text-danger-700 ring-danger-600/15" },
    PURCHASE_CONFIRMED_MOCK: { label: "Purchase confirmed", cls: "bg-success-50 text-success-700 ring-success-600/15" },
  };
  const m = map[status] || { label: status, cls: "bg-surface-muted text-text-mid ring-border" };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.cls}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{m.label}</span>
    </span>
  );
}

/** Dual-signal tags: every piece of content in the app is either
 * LLM-authored (amber, "proposes") or a deterministic code decision
 * (indigo, "decides"). Used consistently so the deck's core philosophy
 * is visible at a glance, not just explained in a paragraph. */
export function AiTag({ children = "LLM proposed" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ai-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ai-700 ring-1 ring-inset ring-ai-500/20">
      <Sparkles size={10} strokeWidth={2.5} />
      {children}
    </span>
  );
}

export function CodeTag({ children = "Code decided" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-500/20">
      <span className="font-mono">{"{ }"}</span>
      {children}
    </span>
  );
}

export function RoleLock({ label }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-dim ring-1 ring-inset ring-border">
      <Lock size={10} strokeWidth={2.5} />
      {label}
    </span>
  );
}

export function Eyebrow({ children, tone = "brand" }) {
  const cls = tone === "ai" ? "text-ai-600" : "text-brand-600";
  return <div className={`text-[11px] font-semibold uppercase tracking-wider ${cls}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, sub, tone, right }) {
  return (
    <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-lg font-semibold text-text-hi md:text-xl">{title}</h2>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-mid">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(20,23,43,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Metric({ label, value, accent = "text-text-hi", icon: Icon }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2 text-text-dim">
        {Icon && <Icon size={14} strokeWidth={2} />}
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <span className={`text-2xl font-semibold leading-tight tracking-tight ${accent}`}>{value}</span>
    </div>
  );
}

export function Button({ children, variant = "secondary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:opacity-50",
    ai: "bg-ai-600 text-white hover:bg-ai-700 shadow-sm disabled:opacity-50",
    secondary: "bg-white text-text-hi border border-border-strong hover:bg-surface-muted disabled:opacity-50",
    ghost: "text-text-mid hover:bg-surface-muted disabled:opacity-50",
    danger: "bg-white text-danger-600 border border-danger-600/25 hover:bg-danger-50 disabled:opacity-50",
    success: "bg-white text-success-700 border border-success-600/25 hover:bg-success-50 disabled:opacity-50",
  };
  return (
    <button
      className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
