import { Check, X, ShieldAlert } from "lucide-react";
import { inr } from "../api";
import { CodeTag } from "./Primitives";

/**
 * The deck's central thesis — "the LLM proposes, but only deterministic
 * code decides" — rendered literally: every vendor is a card that
 * travels through a gate. Passed vendors continue on to the scored
 * ranking; failed vendors stop at the gate with their exact reason
 * pinned to them. Nothing here is decorative — every element maps to a
 * real field from the API response.
 */
export default function FirewallGate({ firewallResults, gstinChecks, vendorsById }) {
  const gstinById = Object.fromEntries((gstinChecks || []).map((g) => [g.gstin, g]));

  if (!firewallResults?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-text-dim">
        No vendors evaluated — this brief was held at an earlier gate.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center gap-3">
        <ShieldAlert size={15} className="shrink-0 text-brand-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-mid">
          Zero-trust constraint firewall
        </span>
        <CodeTag>Code decides</CodeTag>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {firewallResults.map((fw, i) => {
          const vendor = vendorsById[fw.vendor_id];
          if (!vendor) return null;
          const gstin = gstinById[vendor.gstin];
          const passed = fw.passed;

          return (
            <div
              key={fw.vendor_id}
              className={`animate-fade-up flex min-w-0 flex-col gap-2.5 rounded-lg border p-4 ${
                passed ? "border-success-600/25 bg-success-50/40" : "border-danger-600/25 bg-danger-50/40"
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-hi">{vendor.name}</div>
                  <div className="mt-0.5 truncate text-xs text-text-dim">
                    {inr(vendor.unit_price_inr)}/unit · {vendor.delivery_days}d delivery
                  </div>
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    passed ? "bg-success-600 text-white" : "bg-danger-600 text-white"
                  }`}
                >
                  {passed ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                </span>
              </div>

              {gstin && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <div
                    className={`w-fit max-w-full truncate rounded px-1.5 py-0.5 font-mono text-[10px] ${
                      gstin.verdict ? "bg-surface text-text-dim ring-1 ring-border" : "bg-danger-50 text-danger-700"
                    }`}
                    title={vendor.gstin}
                  >
                    GSTIN {gstin.verdict ? "verified" : "invalid"} · {vendor.gstin}
                  </div>
                  {gstin.verdict && gstin.is_msme_udyam && (
                    <div className="w-fit rounded bg-success-50 px-1.5 py-0.5 text-[10px] font-medium text-success-700 ring-1 ring-inset ring-success-600/20">
                      MSME / Udyam
                    </div>
                  )}
                </div>
              )}

              {!passed && (
                <ul className="space-y-0.5 text-xs text-danger-700">
                  {fw.reasons_failed.map((r, idx) => (
                    <li key={idx} className="flex gap-1.5">
                      <span className="shrink-0">·</span>
                      <span className="min-w-0">{r}</span>
                    </li>
                  ))}
                </ul>
              )}
              {passed && (
                <div className="text-xs text-success-700">
                  Cleared spec, delivery-SLA, warranty &amp; GSTIN checks
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
