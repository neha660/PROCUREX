import type { PipelineResult } from "@/lib/types";

export interface BudgetSegment {
  id: string;
  label: string;
  amountInr: number;
  colorClass: string;
}

const SEGMENT_COLORS = ["bg-gold", "bg-sage", "bg-coral", "bg-blue-400", "bg-purple-400"];

/** Seed briefs are titled "N Category — Section" (e.g. "10 High-Spec
 * Laptops — AI Arena"); custom briefs from the wizard keep whatever
 * free-text title the LLM/mock-parser produced, which has no such
 * structure and can run long — cap it so legends and chart axes stay
 * readable. */
function shortLabel(title: string, max = 28): string {
  const stripped = title.replace(/^\d+\s+/, "").replace(/ — .+$/, "");
  return stripped.length > max ? `${stripped.slice(0, max - 1).trimEnd()}…` : stripped;
}

export function briefSpendInr(summary: PipelineResult["briefs"][number]): number {
  const { audit_entry } = summary;
  if (!audit_entry.unit_price) return 0;
  return audit_entry.unit_price * audit_entry.quantity;
}

export function computeBudgetSegments(pipeline: PipelineResult | null) {
  if (!pipeline) {
    return { segments: [] as BudgetSegment[], reserveInr: 0, totalInr: 0, committedInr: 0 };
  }
  const segments: BudgetSegment[] = pipeline.briefs.map((b, i) => ({
    id: b.brief.id,
    label: shortLabel(b.brief.title),
    amountInr: briefSpendInr(b),
    colorClass: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));
  const committedInr = segments.reduce((sum, s) => sum + s.amountInr, 0);
  const reserveInr = Math.max(0, pipeline.pool.total_inr - committedInr - pipeline.pool.net_surplus_returned_inr);
  return { segments, reserveInr, totalInr: pipeline.pool.total_inr, committedInr };
}

/** Reconstructs the "overage -> bulk savings -> reallocation" narrative
 * generically from whichever briefs actually produced an overage / savings
 * this run, instead of hardcoding the Ignite '26 numbers. */
export function computeBudgetIntelligence(pipeline: PipelineResult | null) {
  if (!pipeline) return null;
  const overageBriefs = pipeline.briefs.filter((b) => b.result.overage_inr > 0);
  const savingsBriefs = pipeline.briefs.filter((b) => b.result.bulk_savings_inr > 0);
  const totalOverage = overageBriefs.reduce((s, b) => s + b.result.overage_inr, 0);
  const totalSavings = savingsBriefs.reduce((s, b) => s + b.result.bulk_savings_inr, 0);
  const netSurplusReturned = pipeline.pool.net_surplus_returned_inr;
  const drawn = Math.max(0, totalSavings - netSurplusReturned);
  const allResolved = pipeline.briefs.every(
    (b) => b.audit_entry.authorisation_status !== "ESCALATED"
  );

  if (overageBriefs.length === 0 && savingsBriefs.length === 0) return null;

  return {
    overageBriefs,
    savingsBriefs,
    totalOverage,
    totalSavings,
    drawn,
    netSurplusReturned,
    allResolved,
  };
}
