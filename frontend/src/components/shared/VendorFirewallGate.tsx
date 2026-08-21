import { Check, X } from "lucide-react";
import { inr } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FirewallResult, GstinCheck, Vendor } from "@/lib/types";

/**
 * The deck's central thesis — "the LLM proposes, but only deterministic
 * code decides" — rendered literally: every vendor is a card that travels
 * through a gate. Passed vendors continue to the scored ranking; failed
 * vendors stop at the gate with their exact reason pinned to them. Every
 * element maps to a real field from the API response — nothing decorative.
 */
export function VendorFirewallGate({
  firewallResults,
  gstinChecks,
  vendorsById,
}: {
  firewallResults: FirewallResult[];
  gstinChecks: GstinCheck[];
  vendorsById: Record<string, Vendor>;
}) {
  const gstinByValue = Object.fromEntries((gstinChecks || []).map((g) => [g.gstin, g]));

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-2">
          Zero-trust constraint firewall
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {firewallResults.map((fw, i) => {
          const vendor = vendorsById[fw.vendor_id];
          if (!vendor) return null;
          const gstin = gstinByValue[vendor.gstin];
          const passed = fw.passed;

          return (
            <li
              key={fw.vendor_id}
              className={cn(
                "animate-gate-pass rounded-lg border p-3.5 flex flex-col gap-2 min-w-0 bg-card",
                passed ? "border-success/25" : "border-danger/25"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{vendor.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate tabular-nums">
                    {inr(vendor.unit_price_inr)}/unit · {vendor.delivery_days}d delivery
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center",
                    passed ? "bg-success text-white" : "bg-danger text-white"
                  )}
                  aria-hidden="true"
                >
                  {passed ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                </span>
              </div>

              {gstin && (
                <div
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded w-fit max-w-full truncate",
                    gstin.verdict ? "bg-surface-muted text-ink-soft" : "bg-danger-soft text-danger"
                  )}
                  title={`GSTIN ${gstin.verdict ? "verified" : "invalid"} · ${vendor.gstin}${gstin.is_msme_udyam ? " · MSME/Udyam" : ""}`}
                >
                  GSTIN {gstin.verdict ? "verified" : "invalid"} · {vendor.gstin}
                  {gstin.is_msme_udyam && " · MSME/Udyam"}
                </div>
              )}

              {!passed && (
                <ul className="text-xs text-danger/90 space-y-0.5 mt-0.5">
                  {fw.reasons_failed.map((r, idx) => (
                    <li key={idx}>· {r}</li>
                  ))}
                </ul>
              )}
              {passed && (
                <p className="text-xs text-success/90 mt-0.5">
                  Cleared spec, delivery-SLA, warranty &amp; GSTIN checks
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
