import type { BriefSummary, EscalationCardData, PipelineResult, ScoredVendor } from "@/lib/types";

export interface EscalationContext {
  summary: BriefSummary | undefined;
  alternative: ScoredVendor | undefined;
  costDiffInr: number | null;
  deliveryImpactDays: number | null;
  failedConstraints: string[];
}

export function buildEscalationContext(
  card: EscalationCardData,
  pipeline: PipelineResult | null
): EscalationContext {
  const summary = pipeline?.briefs.find((b) => b.brief.id === card.brief_id);
  if (!summary) {
    return { summary: undefined, alternative: undefined, costDiffInr: null, deliveryImpactDays: null, failedConstraints: [] };
  }

  const { brief, result, audit_entry } = summary;
  const alternative = result.ranked.find((s) => s.vendor.name !== audit_entry.selected_vendor);

  const currentUnitPrice = audit_entry.unit_price ?? 0;
  const costDiffInr = alternative
    ? (alternative.vendor.unit_price_inr - currentUnitPrice) * brief.quantity
    : null;
  const deliveryImpactDays = alternative ? alternative.vendor.delivery_days - brief.max_delivery_days : null;

  const failedConstraints = Array.from(
    new Set(result.firewall_results.flatMap((fw) => fw.reasons_failed))
  );

  return { summary, alternative, costDiffInr, deliveryImpactDays, failedConstraints };
}
