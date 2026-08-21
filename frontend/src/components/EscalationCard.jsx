import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Button, RoleLock } from "./Primitives";

export default function EscalationCard({ card, onResolve, canResolve }) {
  const [resolving, setResolving] = useState(false);

  const handle = async (option) => {
    setResolving(true);
    try {
      await onResolve(card.id, option);
    } finally {
      setResolving(false);
    }
  };

  const variantFor = (opt) => {
    const lower = opt.toLowerCase();
    if (lower.includes("approve")) return "success";
    if (lower.includes("reject")) return "danger";
    return "secondary";
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-danger-600/20 bg-surface shadow-[0_1px_2px_rgba(20,23,43,0.04)]">
      <div className="flex items-center justify-between gap-2 border-b border-danger-600/15 bg-danger-50/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-danger-600" />
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-danger-700">
            Escalation · {card.brief_id}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 text-sm font-medium text-text-hi">{card.reason}</div>
        <p className="mb-4 text-sm leading-relaxed text-text-mid">{card.context}</p>

        {card.resolved ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-success-700">
            <CheckCircle2 size={15} />
            Resolved — {card.resolution}
          </div>
        ) : canResolve ? (
          <div className="flex flex-wrap gap-2">
            {card.options.map((opt) => (
              <Button key={opt} variant={variantFor(opt)} disabled={resolving} onClick={() => handle(opt)}>
                {opt}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-dim">
            <Lock size={12} />
            Only a Finance Manager can resolve this. <RoleLock label="Finance Manager+" />
          </div>
        )}
      </div>
    </div>
  );
}
