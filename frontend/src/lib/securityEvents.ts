import type { PipelineResult } from "@/lib/types";

export interface SecurityEvent {
  id: string;
  severity: "High" | "Medium";
  type: "Invalid GSTIN" | "Prompt injection";
  timestamp: string;
  vendorName: string;
  briefTitle: string;
  reason: string;
  action: string;
  authorisationImpact: string;
  auditRef: string;
}

/** Reconstructs the security timeline from real pipeline data — the
 * backend doesn't expose a dedicated /security endpoint, but every event
 * it detects is already present in gstin_checks + security_events. */
export function buildSecurityEvents(pipeline: PipelineResult | null): SecurityEvent[] {
  if (!pipeline) return [];
  const events: SecurityEvent[] = [];

  for (const { brief, result, audit_entry } of pipeline.briefs) {
    for (const g of result.gstin_checks) {
      if (g.verdict) continue;
      const vendor = Object.values(result.vendors).find((v) => v.gstin === g.gstin);
      events.push({
        id: `gstin:${brief.id}:${g.gstin}`,
        severity: "High",
        type: "Invalid GSTIN",
        timestamp: audit_entry.timestamp,
        vendorName: vendor?.name || "Unknown vendor",
        briefTitle: brief.title,
        reason: g.detail,
        action: "Excluded before scoring — never reached the weighted-sum model",
        authorisationImpact: "None — vendor was never eligible for selection",
        auditRef: audit_entry.transaction_id,
      });
    }

    for (const [i, msg] of result.security_events.entries()) {
      const vendorMatch = msg.match(/vendor '([^']+)'/);
      events.push({
        id: `injection:${brief.id}:${i}`,
        severity: "Medium",
        type: "Prompt injection",
        timestamp: audit_entry.timestamp,
        vendorName: vendorMatch?.[1] || "Unknown vendor",
        briefTitle: brief.title,
        reason: msg,
        action: "Sanitized and logged before the LLM layer ever saw the text",
        authorisationImpact: "None — deterministic firewall still governs pass/fail",
        auditRef: audit_entry.transaction_id,
      });
    }
  }

  return events.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "High" ? -1 : 1));
}
