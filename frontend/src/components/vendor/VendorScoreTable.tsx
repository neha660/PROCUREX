import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ScoredVendor } from "@/lib/types";

function ScoreBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[92px]">
      <div className="h-1.5 flex-1 rounded-full bg-ink-800 overflow-hidden" role="presentation">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-[11px] text-text-mid w-8 text-right">{value}</span>
    </div>
  );
}

/** Stage 2 — weighted sum model. Only firewall survivors ever appear
 * here: no rejected vendor gets a score, let alone a rank. */
export function VendorScoreTable({ ranked, winnerId }: { ranked: ScoredVendor[]; winnerId?: string }) {
  if (!ranked?.length) {
    return (
      <div className="text-sm text-text-dim border border-dashed border-line rounded-lg p-6 text-center">
        No vendor cleared the constraint firewall for this brief.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-ink-800/60 border-line">
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Rank</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Vendor</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Price 40%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Reliability 30%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Delivery 20%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim">Returns 10%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-text-dim text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((s) => {
            const isWinner = s.vendor.id === winnerId;
            return (
              <TableRow key={s.vendor.id} className={cn("border-line", isWinner && "bg-gold/[0.07]")}>
                <TableCell className="font-mono text-text-dim">#{s.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={isWinner ? "text-gold-hi font-medium" : "text-text-hi"}>
                      {s.vendor.name}
                    </span>
                    {isWinner && (
                      <Badge className="bg-gold/20 text-gold-hi text-[10px] uppercase tracking-wide">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-text-dim font-mono mt-0.5">
                    {inr(s.vendor.unit_price_inr)}/unit
                  </div>
                </TableCell>
                <TableCell><ScoreBar value={s.price_score} colorClass="bg-gold" /></TableCell>
                <TableCell><ScoreBar value={s.reliability_score} colorClass="bg-sage" /></TableCell>
                <TableCell><ScoreBar value={s.delivery_score} colorClass="bg-blue-400" /></TableCell>
                <TableCell><ScoreBar value={s.return_score} colorClass="bg-purple-400" /></TableCell>
                <TableCell className="text-right font-display font-semibold text-text-hi">
                  {s.total_score}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
