import { inr } from "@/lib/api";
import type { BriefSummary, PipelineResult } from "@/lib/types";

export type ChipStatus = "Passed" | "Failed" | "Needs review";

export interface FirewallChip {
  label: string;
  status: ChipStatus;
  detail: string;
}

const REASON = {
  SPEC: "Does not meet minimum spec",
  DELIVERY: "Delivery exceeds SLA",
  WARRANTY: "Warranty requirement not met",
  GSTIN: "Invalid GSTIN — checksum mismatch",
  DATA_QUALITY: "Malformed or incomplete vendor data",
};

/**
 * System-level view across every vendor evaluated in the current run —
 * used on the Overview "Constraint firewall" explainer to show the code
 * layer is actually catching real violations, not just passing everything.
 */
export function aggregateFirewallChips(pipeline: PipelineResult | null): FirewallChip[] {
  if (!pipeline) return [];
  const allFirewall = pipeline.briefs.flatMap((b) => b.result.firewall_results);
  const allGstin = pipeline.briefs.flatMap((b) => b.result.gstin_checks);
  const vendorsById = Object.fromEntries(
    pipeline.briefs.flatMap((b) => Object.entries(b.result.vendors))
  );

  const findFailures = (reason: string) =>
    allFirewall.filter((fw) => fw.reasons_failed.includes(reason));

  const specFails = findFailures(REASON.SPEC);
  const deliveryFails = findFailures(REASON.DELIVERY);
  const warrantyFails = findFailures(REASON.WARRANTY);
  const gstinFails = findFailures(REASON.GSTIN);
  const dataQualityFails = findFailures(REASON.DATA_QUALITY);

  const nameOf = (vendorId: string) => vendorsById[vendorId]?.name || vendorId;
  const gstinDetailOf = (vendorId: string) => {
    const v = vendorsById[vendorId];
    const g = allGstin.find((gc) => gc.gstin === v?.gstin);
    return g?.detail;
  };

  const overages = pipeline.briefs.filter((b) => b.result.overage_inr > 0);
  const unresolvedOverage = overages.some(
    (b) => b.audit_entry.authorisation_status === "ESCALATED"
  );

  return [
    {
      label: "Price cap",
      status: overages.length === 0 ? "Passed" : unresolvedOverage ? "Failed" : "Needs review",
      detail:
        overages.length === 0
          ? "Every selected vendor is within its brief's per-unit price cap."
          : overages
              .map(
                (b) =>
                  `${b.brief.title} exceeded cap by ${inr(b.result.overage_inr)} — ${
                    b.audit_entry.authorisation_status === "AUTO_APPROVED"
                      ? "auto-covered from the shared pool"
                      : "unresolved, escalated"
                  }.`
              )
              .join(" "),
    },
    {
      label: "Required specs",
      status: specFails.length === 0 ? "Passed" : "Failed",
      detail:
        specFails.length === 0
          ? "All evaluated vendors met minimum RAM/SSD spec, or the brief had no spec floor."
          : `Rejected: ${specFails.map((f) => nameOf(f.vendor_id)).join(", ")} — below minimum RAM/SSD.`,
    },
    {
      label: "Delivery SLA",
      status: deliveryFails.length === 0 ? "Passed" : "Failed",
      detail:
        deliveryFails.length === 0
          ? "All evaluated vendors can deliver within the brief's SLA window."
          : `Rejected: ${deliveryFails.map((f) => nameOf(f.vendor_id)).join(", ")} — delivery exceeds SLA.`,
    },
    {
      label: "Warranty",
      status: warrantyFails.length === 0 ? "Passed" : "Failed",
      detail:
        warrantyFails.length === 0
          ? "All evaluated vendors meet the brief's warranty requirement (or none was required)."
          : `Rejected: ${warrantyFails.map((f) => nameOf(f.vendor_id)).join(", ")} — no warranty offered.`,
    },
    {
      label: "GSTIN structure",
      status: gstinFails.length === 0 ? "Passed" : "Failed",
      detail:
        gstinFails.length === 0
          ? "Every vendor's GSTIN passed structural, state-code, and mod-36 checksum validation."
          : `Rejected: ${gstinFails
              .map((f) => `${nameOf(f.vendor_id)} (${gstinDetailOf(f.vendor_id) || "checksum mismatch"})`)
              .join(", ")}.`,
    },
    {
      label: "Vendor data quality",
      status: dataQualityFails.length === 0 ? "Passed" : "Failed",
      detail:
        dataQualityFails.length === 0
          ? "No malformed or incomplete vendor listings were encountered this run."
          : `Rejected: ${dataQualityFails.map((f) => nameOf(f.vendor_id)).join(", ")} — incomplete listing data.`,
    },
  ];
}

/** Winner-scoped chips for a single brief — what actually gated its
 * selected vendor, shown on the brief's own card/detail. */
export function briefWinnerChips(summary: BriefSummary): FirewallChip[] {
  const { audit_entry, result } = summary;
  const hasWinner = !!audit_entry.selected_vendor;

  const priceStatus: ChipStatus =
    result.overage_inr <= 0
      ? "Passed"
      : audit_entry.authorisation_status === "AUTO_APPROVED"
        ? "Needs review"
        : "Failed";

  const priceDetail =
    result.overage_inr <= 0
      ? "Selected vendor is within the per-unit price cap."
      : `Exceeded cap by ${inr(result.overage_inr)} — ${
          priceStatus === "Needs review"
            ? "auto-covered from the shared budget pool, no escalation needed."
            : "unresolved after shared-pool reallocation, escalated to a human."
        }`;

  if (!hasWinner) {
    return [
      {
        label: "Hard constraints",
        status: "Failed",
        detail: "No vendor cleared every hard constraint (or no in-stock fallback remained).",
      },
    ];
  }

  return [
    { label: "Price cap", status: priceStatus, detail: priceDetail },
    {
      label: "Specs & delivery SLA",
      status: "Passed",
      detail: "Selected vendor met minimum spec and the delivery-SLA window.",
    },
    {
      label: "Warranty",
      status: "Passed",
      detail: "Selected vendor met the brief's warranty requirement (or none was required).",
    },
    {
      label: "GSTIN & data quality",
      status: "Passed",
      detail: "Selected vendor's GSTIN passed the trust layer; listing data was well-formed.",
    },
  ];
}
