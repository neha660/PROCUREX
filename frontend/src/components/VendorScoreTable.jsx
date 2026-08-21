import { inr } from "../api";

function ScoreBar({ value, colorClass }) {
  return (
    <div className="flex min-w-[84px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-[11px] text-text-mid">{value}</span>
    </div>
  );
}

export default function VendorScoreTable({ ranked, winnerId }) {
  if (!ranked?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-text-dim">
        No vendor cleared the constraint firewall for this brief.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-surface-muted text-left text-[11px] font-medium uppercase tracking-wide text-text-dim">
            <th className="px-3 py-2.5 font-medium">Rank</th>
            <th className="px-3 py-2.5 font-medium">Vendor</th>
            <th className="px-3 py-2.5 font-medium">Price 40%</th>
            <th className="px-3 py-2.5 font-medium">Reliability 30%</th>
            <th className="px-3 py-2.5 font-medium">Delivery 20%</th>
            <th className="px-3 py-2.5 font-medium">Returns 10%</th>
            <th className="px-3 py-2.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => {
            const isWinner = s.vendor.id === winnerId;
            return (
              <tr key={s.vendor.id} className={`border-t border-border ${isWinner ? "bg-brand-50/50" : ""}`}>
                <td className="px-3 py-2.5 font-mono text-text-dim">#{s.rank}</td>
                <td className="max-w-[180px] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`truncate ${isWinner ? "font-medium text-brand-700" : "text-text-hi"}`}>
                      {s.vendor.name}
                    </span>
                    {isWinner && (
                      <span className="shrink-0 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-text-dim">
                    {inr(s.vendor.unit_price_inr)}/unit
                  </div>
                </td>
                <td className="px-3 py-2.5"><ScoreBar value={s.price_score} colorClass="bg-brand-500" /></td>
                <td className="px-3 py-2.5"><ScoreBar value={s.reliability_score} colorClass="bg-success-600" /></td>
                <td className="px-3 py-2.5"><ScoreBar value={s.delivery_score} colorClass="bg-sky-500" /></td>
                <td className="px-3 py-2.5"><ScoreBar value={s.return_score} colorClass="bg-violet-500" /></td>
                <td className="px-3 py-2.5 text-right font-semibold text-text-hi">{s.total_score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
