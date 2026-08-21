import { inr } from "../api";

export default function PoolGauge({ pool }) {
  if (!pool) return null;
  const spentPct = Math.min(100, (pool.allocated_inr / pool.total_inr) * 100);
  const savedPct = Math.min(
    100 - spentPct,
    (pool.surplus_bank_inr / pool.total_inr) * 100
  );

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs text-text-mid">
        <span className="shrink-0 font-medium text-text-hi">{inr(pool.total_inr)} pool</span>
        <span className="truncate text-text-dim">
          {inr(pool.allocated_inr)} allocated · {inr(pool.surplus_bank_inr)} banked
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${spentPct}%` }}
          title="Allocated / spent"
        />
        <div
          className="h-full bg-success-600 transition-all duration-500"
          style={{ width: `${savedPct}%` }}
          title="Banked surplus"
        />
      </div>
    </div>
  );
}
