import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/Primitives";
import { inr } from "@/lib/api";
import { cn } from "@/lib/utils";
import { recommendedAction, type VendorRow } from "@/lib/vendorRows";
import { Check, X, ShieldAlert } from "lucide-react";

export function VendorDetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: VendorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;
  const { vendor, brief, firewallResult, gstinCheck, scored, isWinner, negotiation, auditEntry } = row;
  const passed = firewallResult.passed;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-ink-950 border-line p-0 gap-0">
        <SheetHeader className="border-b border-line pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl text-text-hi truncate">{vendor.name}</SheetTitle>
              <SheetDescription>
                {vendor.source} · for {brief.title.split(" — ").pop()}
              </SheetDescription>
            </div>
            <Badge
              className={cn(
                "shrink-0",
                passed ? "bg-sage/15 text-sage-hi border-sage/30" : "bg-coral/15 text-coral-hi border-coral/30"
              )}
              variant="outline"
            >
              {passed ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              {passed ? "Passed firewall" : "Rejected"}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-5.5rem)]">
          <div className="p-6 flex flex-col gap-6 text-sm">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <span className="text-text-dim">Unit price</span>
              <span className="text-right text-text-hi">{inr(vendor.unit_price_inr)}</span>
              <span className="text-text-dim">Delivery</span>
              <span className="text-right text-text-hi">{vendor.delivery_days} days</span>
              <span className="text-text-dim">Warranty</span>
              <span className="text-right text-text-hi">{vendor.has_warranty ? "Yes" : "No"}</span>
              <span className="text-text-dim">Rating</span>
              <span className="text-right text-text-hi">{vendor.rating}★</span>
              <span className="text-text-dim">Return window</span>
              <span className="text-right text-text-hi">{vendor.return_window_days} days</span>
              <span className="text-text-dim">Stock</span>
              <span className="text-right text-text-hi">{vendor.in_stock ? "In stock" : "Out of stock"}</span>
              {(vendor.ram_gb || vendor.ssd_gb) && (
                <>
                  <span className="text-text-dim">Spec</span>
                  <span className="text-right text-text-hi">
                    {vendor.ram_gb ? `${vendor.ram_gb}GB RAM` : ""}
                    {vendor.ram_gb && vendor.ssd_gb ? " / " : ""}
                    {vendor.ssd_gb ? `${vendor.ssd_gb}GB SSD` : ""}
                  </span>
                </>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                Vendor trust layer — GSTIN
              </h4>
              <p className="font-mono text-xs bg-ink-900 border border-line rounded-md p-2 mb-2">{vendor.gstin}</p>
              {gstinCheck ? (
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-1.5">
                    {gstinCheck.structurally_valid ? <Check className="h-3 w-3 text-sage-hi" /> : <X className="h-3 w-3 text-coral-hi" />}
                    Structurally valid
                  </li>
                  <li className="flex items-center gap-1.5">
                    {gstinCheck.state_code_valid ? <Check className="h-3 w-3 text-sage-hi" /> : <X className="h-3 w-3 text-coral-hi" />}
                    State code valid
                  </li>
                  <li className="flex items-center gap-1.5">
                    {gstinCheck.checksum_valid ? <Check className="h-3 w-3 text-sage-hi" /> : <X className="h-3 w-3 text-coral-hi" />}
                    Mod-36 checksum verified
                  </li>
                  <li className="flex items-center gap-1.5">
                    {gstinCheck.is_msme_udyam ? <Check className="h-3 w-3 text-sage-hi" /> : <span className="h-3 w-3 inline-block" />}
                    {gstinCheck.is_msme_udyam ? "MSME / Udyam registered" : "Not flagged MSME / Udyam"}
                  </li>
                </ul>
              ) : (
                <p className="text-text-dim text-xs">No GSTIN check on record for this vendor.</p>
              )}
              {gstinCheck && !gstinCheck.verdict && (
                <p className="mt-2 text-xs text-coral-hi bg-coral/10 border border-coral/30 rounded-md p-2">
                  {gstinCheck.detail}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                {passed ? "Why this vendor passed" : "Why this vendor was rejected"}
              </h4>
              {passed ? (
                <p className="text-text-mid">
                  Cleared minimum spec, delivery-SLA, warranty, and GSTIN trust checks — the only
                  vendors that reach the weighted-score stage at all.
                </p>
              ) : (
                <ul className="text-coral-hi space-y-1">
                  {firewallResult.reasons_failed.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <X className="h-3 w-3 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {vendor.raw_listing_text?.match(/\[SYSTEM|ignore|bypass|disregard/i) && (
              <div className="rounded-lg border border-coral/30 bg-coral/[0.06] p-3 flex gap-2">
                <ShieldAlert className="h-4 w-4 text-coral-hi shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-coral-hi">
                  This listing's source text contained a suspected prompt-injection attempt. It was
                  sanitized before reaching the LLM and had no effect on this vendor's pass/fail
                  outcome — see Security events for the full record.
                </p>
              </div>
            )}

            {scored && (
              <>
                <Separator />
                <div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                    Weighted score — {scored.total_score}/100
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-text-dim">Price (40%)</span>
                    <span className="text-right text-text-hi">{scored.price_score}</span>
                    <span className="text-text-dim">Reliability &amp; warranty (30%)</span>
                    <span className="text-right text-text-hi">{scored.reliability_score}</span>
                    <span className="text-text-dim">Delivery (20%)</span>
                    <span className="text-right text-text-hi">{scored.delivery_score}</span>
                    <span className="text-text-dim">Returns (10%)</span>
                    <span className="text-right text-text-hi">{scored.return_score}</span>
                  </div>
                </div>
              </>
            )}

            {negotiation && negotiation.bulk_tier_applied && (
              <>
                <Separator />
                <div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                    Negotiation history
                  </h4>
                  <p className="text-text-mid">
                    {inr(negotiation.original_unit_price_inr)} → {inr(negotiation.negotiated_unit_price_inr)}/unit
                    (bulk tier applied) · saved{" "}
                    <span className="text-sage-hi">{inr(negotiation.savings_total_inr)}</span> total.
                  </p>
                </div>
              </>
            )}

            {isWinner && (
              <>
                <Separator />
                <div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wide text-text-dim mb-2">
                    Counterfactual — what would change the outcome
                  </h4>
                  <p className="text-text-mid">{auditEntry.counterfactual_analysis}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-text-dim text-xs">Recommended action</span>
              <StatusPill status={isWinner ? "AUTO_APPROVED" : passed ? "Ready" : "REJECTED"} />
            </div>
            <p className="text-xs text-text-dim">{recommendedAction(row)}</p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
