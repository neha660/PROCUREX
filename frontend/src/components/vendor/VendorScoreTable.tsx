import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ScoredVendor } from "@/lib/types";

function ScoreBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[92px]">
      <div className="h-1.5 flex-1 rounded-full bg-surface-muted overflow-hidden" role="presentation">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

/** Stage 2 — weighted sum model. Only firewall survivors ever appear
 * here: no rejected vendor gets a score, let alone a rank. */
export function VendorScoreTable({ ranked, winnerId }: { ranked: ScoredVendor[]; winnerId?: string }) {
  if (!ranked?.length) {
    return (
      <div className="text-sm text-muted-foreground border border-dashed border-border-strong rounded-lg p-6 text-center">
        No vendor cleared the constraint firewall for this brief.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-muted hover:bg-surface-muted">
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Rank</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Vendor</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Price 40%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Reliability 30%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Delivery 20%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Returns 10%</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((s) => {
            const isWinner = s.vendor.id === winnerId;
            return (
              <TableRow key={s.vendor.id} className={cn(isWinner && "bg-brand-soft/50")}>
                <TableCell className="font-mono text-muted-foreground">#{s.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={isWinner ? "text-brand font-medium" : "text-foreground"}>{s.vendor.name}</span>
                    {isWinner && (
                      <Badge className="bg-brand text-white text-[10px] uppercase tracking-wide">Selected</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {inr(s.vendor.unit_price_inr)}/unit
                  </div>
                </TableCell>
                <TableCell><ScoreBar value={s.price_score} colorClass="bg-money" /></TableCell>
                <TableCell><ScoreBar value={s.reliability_score} colorClass="bg-success" /></TableCell>
                <TableCell><ScoreBar value={s.delivery_score} colorClass="bg-brand" /></TableCell>
                <TableCell><ScoreBar value={s.return_score} colorClass="bg-ink-faint" /></TableCell>
                <TableCell className="text-right font-display font-semibold text-foreground tabular-nums">
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
