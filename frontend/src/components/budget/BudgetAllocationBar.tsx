import { inr } from "@/lib/api";
import { computeBudgetSegments } from "@/lib/budget";
import type { PipelineResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The shared ₹65,00,000 pool rendered as one horizontal allocation bar —
 * the visual centrepiece: every brief draws from the same pool instead of
 * an isolated per-brief budget. Segment widths use a visible floor so a
 * small commit against a ₹65L pool still reads as a bar, not a hairline.
 */
export function BudgetAllocationBar({ pipeline }: { pipeline: PipelineResult | null }) {
  const { segments, reserveInr, totalInr, committedInr } = computeBudgetSegments(pipeline);

  if (!pipeline || totalInr === 0) {
    return <div className="h-3 w-full rounded-full bg-ink-800 animate-pulse" aria-hidden="true" />;
  }

  const MIN_PCT = 3;
  const raw = [...segments.map((s) => s.amountInr), pipeline.pool.net_surplus_returned_inr, reserveInr];
  const nonZeroCount = raw.filter((v) => v > 0).length;
  const flexPct = (amount: number) =>
    amount <= 0 ? 0 : Math.max(MIN_PCT, (amount / totalInr) * 100 * (nonZeroCount <= 2 ? 1 : 0.94));

  return (
    <div className="flex flex-col gap-3 w-full">
      <div
        className="h-3.5 w-full rounded-full bg-ink-800 overflow-hidden flex ring-1 ring-line"
        role="img"
        aria-label={`Shared pool of ${inr(totalInr)}: ${inr(committedInr)} committed across ${segments.length} briefs, ${inr(
          pipeline.pool.net_surplus_returned_inr
        )} saved surplus, ${inr(reserveInr)} available reserve.`}
      >
        {segments.map((s) => (
          <div
            key={s.id}
            className={cn("h-full transition-all duration-700", s.colorClass)}
            style={{ width: `${flexPct(s.amountInr)}%` }}
            title={`${s.label}: ${inr(s.amountInr)}`}
          />
        ))}
        <div
          className="h-full bg-sage-hi/70 transition-all duration-700"
          style={{ width: `${flexPct(pipeline.pool.net_surplus_returned_inr)}%` }}
          title={`Saved surplus: ${inr(pipeline.pool.net_surplus_returned_inr)}`}
        />
        <div
          className="h-full bg-ink-600 transition-all duration-700"
          style={{ width: `${flexPct(reserveInr)}%` }}
          title={`Available reserve: ${inr(reserveInr)}`}
        />
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-mid font-mono">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full shrink-0", s.colorClass)} aria-hidden="true" />
            {s.label}: <span className="text-text-hi">{inr(s.amountInr)}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0 bg-sage-hi/70" aria-hidden="true" />
          Saved surplus: <span className="text-sage-hi">{inr(pipeline.pool.net_surplus_returned_inr)}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0 bg-ink-600" aria-hidden="true" />
          Available reserve: <span className="text-text-hi">{inr(reserveInr)}</span>
        </li>
      </ul>
    </div>
  );
}
