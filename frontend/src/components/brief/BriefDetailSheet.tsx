import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/shared/Primitives";
import { PipelineStepper } from "@/components/shared/PipelineStepper";
import { VendorFirewallGate } from "@/components/shared/VendorFirewallGate";
import { VendorScoreTable } from "@/components/vendor/VendorScoreTable";
import { inr } from "@/lib/api";
import { briefUiStatus } from "@/lib/types";
import type { BriefSummary } from "@/lib/types";
import { RotateCcw, Zap, FileText } from "lucide-react";

export function BriefDetailSheet({
  summary,
  open,
  onOpenChange,
  onSimulateOutage,
  onReset,
}: {
  summary: BriefSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSimulateOutage: (vendorId: string) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const navigate = useNavigate();
  if (!summary) return null;

  const { brief, audit_entry, result } = summary;
  const status = briefUiStatus(summary);
  const outcome =
    status === "Escalated" ? "escalated" : status === "Ready" || status === "Purchased" ? "purchased" : "pending";
  const winner = result.ranked.find((s) => s.vendor.name === audit_entry.selected_vendor);

  const handleOutage = async (vendorId: string, name: string) => {
    await onSimulateOutage(vendorId);
    toast.info(`Marked "${name}" out of stock`, {
      description: "Re-ran the pipeline — watch for a replan event below.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-ink-950 border-line p-0 gap-0">
        <SheetHeader className="border-b border-line pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl text-text-hi truncate">{brief.title}</SheetTitle>
              <SheetDescription>
                Qty {brief.quantity} · cap {inr(brief.max_unit_price_inr)}/unit · ≤{brief.max_delivery_days}d delivery
                {brief.requires_warranty && " · warranty required"}
              </SheetDescription>
            </div>
            <StatusPill status={status} className="shrink-0" />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-5.5rem)]">
          <div className="p-6 flex flex-col gap-8">
            <section aria-label="Pipeline progress">
              <PipelineStepper outcome={outcome} />
            </section>

            <Separator />

            <section aria-labelledby="firewall-h">
              <h3 id="firewall-h" className="font-display text-base font-semibold text-text-hi mb-1">
                Vendor discovery → trust layer → hard filter
              </h3>
              <p className="text-sm text-text-mid mb-4">
                Every listing is sanitized for prompt-injection before the LLM ever sees it, then
                gated on GSTIN validity, spec, delivery-SLA, and warranty.
              </p>
              <VendorFirewallGate
                firewallResults={result.firewall_results}
                gstinChecks={result.gstin_checks}
                vendorsById={result.vendors}
              />
            </section>

            <Separator />

            <section aria-labelledby="score-h">
              <h3 id="score-h" className="font-display text-base font-semibold text-text-hi mb-1">
                Weighted sum model
              </h3>
              <p className="text-sm text-text-mid mb-4">
                Only firewall survivors are scored: Price 40% · Reliability &amp; Warranty 30% ·
                Delivery 20% · Returns 10%.
              </p>
              <VendorScoreTable ranked={result.ranked} winnerId={winner?.vendor.id} />
            </section>

            {result.replan_events.length > 0 && (
              <>
                <Separator />
                <section
                  aria-labelledby="replan-h"
                  className="rounded-lg border border-gold/30 bg-gold/[0.04] p-4"
                >
                  <h3 id="replan-h" className="font-display text-base font-semibold text-gold-hi mb-2">
                    Dynamic re-planning triggered
                  </h3>
                  {result.replan_events.map((ev, i) => (
                    <p key={i} className="text-sm text-text-mid mb-1">
                      <span className="text-gold-hi">{ev.trigger}</span> — {ev.note}
                    </p>
                  ))}
                </section>
              </>
            )}

            <Separator />

            <section aria-labelledby="sim-h">
              <h3 id="sim-h" className="font-display text-base font-semibold text-text-hi mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold-hi" aria-hidden="true" />
                Simulate a vendor going out of stock
              </h3>
              <p className="text-sm text-text-mid mb-3">
                Knocks out a ranked vendor and re-runs the pipeline, showing the fallback
                re-planner or an honest escalation.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.ranked.slice(0, 3).map((s) => (
                  <Button
                    key={s.vendor.id}
                    variant="outline"
                    size="sm"
                    className="border-line font-mono text-xs"
                    onClick={() => handleOutage(s.vendor.id, s.vendor.name)}
                  >
                    Knock out #{s.rank} {s.vendor.name}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gold/30 text-gold-hi font-mono text-xs gap-1.5"
                  onClick={onReset}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset outages
                </Button>
              </div>
            </section>

            <Separator />

            <Button
              variant="outline"
              className="border-line justify-between"
              onClick={() => navigate(`/audit#${audit_entry.transaction_id}`)}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                View decision receipt — {audit_entry.transaction_id}
              </span>
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
