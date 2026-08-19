import { Laptop, Tv, Shirt, Package, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/Primitives";
import { FirewallChipBadge } from "@/components/shared/FirewallChip";
import { inr } from "@/lib/api";
import { briefUiStatus } from "@/lib/types";
import { briefWinnerChips } from "@/lib/firewallChips";
import type { BriefSummary } from "@/lib/types";

const ICONS: Record<string, typeof Laptop> = {
  "AI-ARENA": Laptop,
  "MAIN-STAGE": Tv,
  "SWAG-DESK": Shirt,
};

function iconFor(briefId: string) {
  const key = Object.keys(ICONS).find((k) => briefId.includes(k));
  return key ? ICONS[key] : Package;
}

export function BriefCard({
  summary,
  onOpenDetail,
}: {
  summary: BriefSummary;
  onOpenDetail: () => void;
}) {
  const { brief, audit_entry, result } = summary;
  const status = briefUiStatus(summary);
  const Icon = iconFor(brief.id);
  const winner = result.ranked.find((s) => s.vendor.name === audit_entry.selected_vendor);
  const chips = briefWinnerChips(summary);
  const estimatedSpend = audit_entry.unit_price
    ? audit_entry.unit_price * audit_entry.quantity
    : brief.max_unit_price_inr * brief.quantity;

  const actionLabel =
    status === "Escalated" ? "Review escalation" : status === "Purchased" || status === "Ready" ? "View decision receipt" : "View pipeline";

  return (
    <Card className="flex flex-col h-full border-line/80 hover:border-ink-600 transition-colors">
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-ink-800 text-gold-hi flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-text-hi leading-tight">
                {brief.title.split(" — ").pop()}
              </h3>
              <p className="text-xs text-text-dim">{brief.quantity} units</p>
            </div>
          </div>
          <StatusPill status={status} />
        </div>

        <dl className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
          <dt className="text-text-dim">Estimated spend</dt>
          <dd className="text-right text-text-hi font-medium">{inr(estimatedSpend)}</dd>
          <dt className="text-text-dim">Key constraint</dt>
          <dd className="text-right text-text-hi">
            cap {inr(brief.max_unit_price_inr)}/unit · ≤{brief.max_delivery_days}d
          </dd>
          <dt className="text-text-dim">Selected vendor</dt>
          <dd className="text-right text-text-hi truncate">
            {audit_entry.selected_vendor || "—"}
            {audit_entry.unit_price && (
              <span className="block text-xs text-text-dim font-normal">
                {inr(audit_entry.unit_price)}/unit
              </span>
            )}
          </dd>
          <dt className="text-text-dim">Delivery</dt>
          <dd className="text-right text-text-hi">
            {audit_entry.delivery_days ? `${audit_entry.delivery_days} days` : "—"}
          </dd>
          {winner && (
            <>
              <dt className="text-text-dim">Soft score</dt>
              <dd className="text-right text-gold-hi font-display font-semibold">
                {winner.total_score.toFixed(1)}/100
              </dd>
            </>
          )}
          <dt className="text-text-dim">Variance</dt>
          <dd className="text-right">
            {result.bulk_savings_inr > 0 ? (
              <span className="text-sage-hi inline-flex items-center gap-1 justify-end">
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
                {inr(result.bulk_savings_inr)} saved
              </span>
            ) : result.overage_inr > 0 ? (
              <span className="text-coral-hi inline-flex items-center gap-1 justify-end">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                {inr(result.overage_inr)} over
              </span>
            ) : (
              <span className="text-text-dim">On budget</span>
            )}
          </dd>
        </dl>

        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {chips.slice(0, 2).map((chip) => (
            <FirewallChipBadge key={chip.label} chip={chip} />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDetail}
          className="border-line justify-between mt-1"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}
