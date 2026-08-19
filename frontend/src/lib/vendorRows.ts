import type { AuditEntry, BuyingBrief, FirewallResult, GstinCheck, NegotiationResult, PipelineResult, ScoredVendor, Vendor } from "@/lib/types";

export interface VendorRow {
  key: string;
  brief: BuyingBrief;
  vendor: Vendor;
  firewallResult: FirewallResult;
  gstinCheck: GstinCheck | undefined;
  scored: ScoredVendor | undefined;
  isWinner: boolean;
  negotiation: NegotiationResult | null;
  auditEntry: AuditEntry;
}

export type HardFilterFilter = "all" | "passed" | "failed";

export function buildVendorRows(pipeline: PipelineResult | null): VendorRow[] {
  if (!pipeline) return [];
  const rows: VendorRow[] = [];

  for (const summary of pipeline.briefs) {
    const { brief, result, audit_entry } = summary;
    const gstinByValue = Object.fromEntries(result.gstin_checks.map((g) => [g.gstin, g]));
    const scoredById = Object.fromEntries(result.ranked.map((s) => [s.vendor.id, s]));

    for (const fw of result.firewall_results) {
      const vendor = result.vendors[fw.vendor_id];
      if (!vendor) continue;
      const isWinner = audit_entry.selected_vendor === vendor.name;
      rows.push({
        key: `${brief.id}:${vendor.id}`,
        brief,
        vendor,
        firewallResult: fw,
        gstinCheck: gstinByValue[vendor.gstin],
        scored: scoredById[vendor.id],
        isWinner,
        negotiation: isWinner ? result.negotiation : null,
        auditEntry: audit_entry,
      });
    }
  }
  return rows;
}

export function recommendedAction(row: VendorRow): string {
  if (row.isWinner) return "Selected & authorised";
  if (row.firewallResult.passed) return "Compliant fallback";
  return `Rejected — ${row.firewallResult.reasons_failed[0] || "hard constraint"}`;
}
