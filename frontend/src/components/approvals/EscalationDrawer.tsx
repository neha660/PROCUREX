import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/api";
import { buildEscalationContext } from "@/lib/escalationContext";
import type { EscalationCardData, PipelineResult } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Shuffle, RefreshCw, Loader2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function EscalationDrawer({
  card,
  pipeline,
  open,
  onOpenChange,
  onResolve,
}: {
  card: EscalationCardData | null;
  pipeline: PipelineResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: string, resolution: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  if (!card) return null;

  const ctx = buildEscalationContext(card, pipeline);
  const brief = ctx.summary?.brief;

  const act = async (label: string, resolution: string) => {
    setBusy(label);
    try {
      await onResolve(card.id, resolution);
      toast.success(`Escalation resolved: ${label}`, { description: card.brief_id });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-ink-950 border-line p-0 gap-0">
        <SheetHeader className="border-b border-line pr-12">
          <div className="flex items-center gap-2 text-coral-hi mb-1">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-wide">
              Human authority required
            </span>
          </div>
          <SheetTitle className="font-display text-xl text-text-hi">
            {brief?.title || card.brief_id}
          </SheetTitle>
          <SheetDescription>
            This is a controlled decision point, not a system failure — ProcureX exhausted every
            deterministic option before asking.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-11rem)]">
          <div className="p-6 flex flex-col gap-6 text-sm">
            {card.resolved ? (
              <div className="rounded-lg border border-sage/30 bg-sage/[0.06] p-4 text-sage-hi flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Resolved — {card.resolution}
              </div>
            ) : null}

            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                Reason for escalation
              </h4>
              <p className="text-text-hi font-medium">{card.reason}</p>
              <p className="text-text-mid mt-1">{card.context}</p>
            </div>

            {ctx.failedConstraints.length > 0 && (
              <div>
                <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                  Failed / unresolved constraints
                </h4>
                <ul className="flex flex-wrap gap-1.5">
                  {ctx.failedConstraints.map((c) => (
                    <li key={c}>
                      <Badge variant="outline" className="border-coral/30 text-coral-hi">
                        {c}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                Current best compliant alternative
              </h4>
              {ctx.alternative ? (
                <div className="rounded-lg border border-line p-3 flex flex-col gap-1">
                  <span className="text-text-hi font-medium">{ctx.alternative.vendor.name}</span>
                  <span className="text-text-mid text-xs">
                    {inr(ctx.alternative.vendor.unit_price_inr)}/unit · {ctx.alternative.vendor.delivery_days}d
                    delivery · score {ctx.alternative.total_score}/100
                  </span>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span>
                      Cost difference:{" "}
                      <strong className={ctx.costDiffInr && ctx.costDiffInr > 0 ? "text-coral-hi" : "text-sage-hi"}>
                        {ctx.costDiffInr !== null ? inr(ctx.costDiffInr) : "—"}
                      </strong>
                    </span>
                    <span>
                      Delivery impact:{" "}
                      <strong className={ctx.deliveryImpactDays && ctx.deliveryImpactDays > 0 ? "text-coral-hi" : "text-sage-hi"}>
                        {ctx.deliveryImpactDays !== null
                          ? `${ctx.deliveryImpactDays > 0 ? "+" : ""}${ctx.deliveryImpactDays}d`
                          : "—"}
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-text-dim text-xs italic">
                  No compliant alternative exists in the current vendor pool — this needs new
                  sourcing, not a substitution.
                </p>
              )}
            </div>

            {ctx.summary && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-1.5 text-text-mid -ml-2 w-fit"
                onClick={() => navigate(`/audit#${ctx.summary!.audit_entry.transaction_id}`)}
              >
                <FileText className="h-3.5 w-3.5" />
                View audit trail — {ctx.summary.audit_entry.transaction_id}
              </Button>
            )}
          </div>
        </ScrollArea>

        {!card.resolved && (
          <SheetFooter className="border-t border-line flex-row gap-2 flex-wrap">
            <Button
              onClick={() => act("Approve exception", "Approve exception — human override authorised")}
              disabled={!!busy}
              className="bg-sage text-ink-950 hover:bg-sage-hi gap-1.5 flex-1 min-w-[9rem]"
            >
              {busy === "Approve exception" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve exception
            </Button>
            <Button
              onClick={() =>
                ctx.alternative &&
                act("Choose fallback", `Fallback approved: ${ctx.alternative.vendor.name}`)
              }
              disabled={!!busy || !ctx.alternative}
              variant="outline"
              className="border-line gap-1.5 flex-1 min-w-[9rem]"
              title={!ctx.alternative ? "No compliant alternative exists" : undefined}
            >
              {busy === "Choose fallback" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
              Choose fallback
            </Button>
            <Button
              onClick={() => act("Request re-plan", "Requested re-plan — sent back to vendor discovery")}
              disabled={!!busy}
              variant="outline"
              className="border-line gap-1.5 flex-1 min-w-[9rem]"
            >
              {busy === "Request re-plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Request re-plan
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
