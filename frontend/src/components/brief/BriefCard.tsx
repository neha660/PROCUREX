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
    <Card className="flex flex-col h-full hover:border-border-strong hover:shadow-md transition-all">
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-md bg-brand-soft text-brand flex items-center justify-center shrink-0">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-semibold text-foreground leading-tight truncate">
                {brief.title.split(" — ").pop()}
              </h3>
              <p className="text-xs text-muted-foreground">{brief.quantity} units</p>
            </div>
          </div>
          <StatusPill status={status} />
        </div>

        <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
          <dt className="text-muted-foreground">Estimated spend</dt>
          <dd className="text-right text-foreground font-medium tabular-nums truncate">{inr(estimatedSpend)}</dd>
          <dt className="text-muted-foreground">Key constraint</dt>
          <dd className="text-right text-foreground tabular-nums truncate">
            cap {inr(brief.max_unit_price_inr)}/unit · ≤{brief.max_delivery_days}d
          </dd>
          <dt className="text-muted-foreground">Selected vendor</dt>
          <dd className="text-right text-foreground truncate">
            {audit_entry.selected_vendor || "—"}
            {audit_entry.unit_price && (
              <span className="block text-xs text-muted-foreground font-normal tabular-nums">
                {inr(audit_entry.unit_price)}/unit
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-right text-foreground truncate">
            {audit_entry.delivery_days ? `${audit_entry.delivery_days} days` : "—"}
          </dd>
          {winner && (
            <>
              <dt className="text-muted-foreground">Soft score</dt>
              <dd className="text-right text-brand font-display font-semibold tabular-nums">
                {winner.total_score.toFixed(1)}/100
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Variance</dt>
          <dd className="text-right truncate">
            {result.bulk_savings_inr > 0 ? (
              <span className="text-success inline-flex items-center gap-1 justify-end tabular-nums">
                <TrendingDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                {inr(result.bulk_savings_inr)} saved
              </span>
            ) : result.overage_inr > 0 ? (
              <span className="text-danger inline-flex items-center gap-1 justify-end tabular-nums">
                <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                {inr(result.overage_inr)} over
              </span>
            ) : (
              <span className="text-muted-foreground">On budget</span>
            )}
          </dd>
        </dl>

        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {chips.slice(0, 2).map((chip) => (
            <FirewallChipBadge key={chip.label} chip={chip} />
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={onOpenDetail} className="justify-between mt-1">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}
