import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, ShieldCheck, ShieldX } from "lucide-react";
import { inr } from "@/lib/api";
import { cn } from "@/lib/utils";
import { recommendedAction, type VendorRow } from "@/lib/vendorRows";

function PassFailIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="inline-flex items-center gap-1 text-sage-hi">
      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-coral-hi">
      <X className="h-3.5 w-3.5" aria-hidden="true" /> Failed
    </span>
  );
}

function TrustIcon({ verdict }: { verdict: boolean | undefined }) {
  if (verdict === undefined) return <span className="text-text-dim">—</span>;
  return verdict ? (
    <span className="inline-flex items-center gap-1 text-sage-hi">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-coral-hi">
      <ShieldX className="h-3.5 w-3.5" aria-hidden="true" /> Invalid
    </span>
  );
}

export function VendorDiscoveryTable({
  rows,
  onSelect,
}: {
  rows: VendorRow[];
  onSelect: (row: VendorRow) => void;
}) {
  return (
    <>
      {/* Desktop / tablet: full comparison table */}
      <div className="hidden md:block rounded-lg border border-line overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ink-800/60 border-line">
              {["Vendor", "Brief", "Source", "GSTIN trust", "Unit price", "Delivery", "Warranty", "Rating", "Hard filter", "Score", "Action"].map(
                (h) => (
                  <TableHead key={h} className="text-[11px] uppercase tracking-wide text-text-dim">
                    {h}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.key}
                tabIndex={0}
                role="button"
                aria-label={`View detail for ${row.vendor.name}`}
                onClick={() => onSelect(row)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(row))}
                className={cn(
                  "border-line cursor-pointer",
                  row.isWinner && "bg-gold/[0.06]",
                  !row.firewallResult.passed && "opacity-70"
                )}
              >
                <TableCell className="font-medium text-text-hi">
                  {row.vendor.name}
                  {row.isWinner && (
                    <Badge className="ml-2 bg-gold/20 text-gold-hi text-[10px] uppercase">Selected</Badge>
                  )}
                  {row.gstinCheck?.is_msme_udyam && (
                    <Badge variant="outline" className="ml-1.5 border-line text-[10px] text-text-dim">
                      MSME
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-text-mid">{row.brief.title.split(" — ").pop()}</TableCell>
                <TableCell className="text-text-mid">{row.vendor.source}</TableCell>
                <TableCell><TrustIcon verdict={row.gstinCheck?.verdict} /></TableCell>
                <TableCell className="text-text-hi">
                  {inr(row.vendor.unit_price_inr)}
                  {row.negotiation?.bulk_tier_applied && (
                    <span className="block text-[10px] text-sage-hi font-mono">
                      → {inr(row.negotiation.negotiated_unit_price_inr)} negotiated
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-text-mid">{row.vendor.delivery_days}d</TableCell>
                <TableCell className="text-text-mid">{row.vendor.has_warranty ? "Yes" : "No"}</TableCell>
                <TableCell className="text-text-mid">{row.vendor.rating}★</TableCell>
                <TableCell><PassFailIcon passed={row.firewallResult.passed} /></TableCell>
                <TableCell className="text-text-hi font-display">
                  {row.scored ? row.scored.total_score : "—"}
                </TableCell>
                <TableCell className="text-text-mid text-xs whitespace-normal max-w-[220px]">
                  {recommendedAction(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card list, same data, no horizontal scrolling */}
      <ul className="md:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key}>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => onSelect(row)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(row))}
              className={cn("cursor-pointer", row.isWinner && "border-gold/40 bg-gold/[0.05]")}
            >
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-text-hi">{row.vendor.name}</div>
                    <div className="text-xs text-text-dim">
                      {row.brief.title.split(" — ").pop()} · {row.vendor.source}
                    </div>
                  </div>
                  {row.isWinner && <Badge className="bg-gold/20 text-gold-hi text-[10px]">Selected</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-text-mid">
                  <span>{inr(row.vendor.unit_price_inr)}/unit</span>
                  <span className="text-right">{row.vendor.delivery_days}d delivery</span>
                  <span><TrustIcon verdict={row.gstinCheck?.verdict} /></span>
                  <span className="text-right"><PassFailIcon passed={row.firewallResult.passed} /></span>
                </div>
                <p className="text-xs text-text-dim">{recommendedAction(row)}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
