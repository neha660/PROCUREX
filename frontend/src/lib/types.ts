/**
 * TypeScript mirrors of the backend Pydantic schemas (backend/app/schemas.py).
 * Kept in one place so every page/component shares the same shape as the
 * real API responses — nothing here is invented, it's a 1:1 port.
 */

export type AuthorisationStatus = "AUTO_APPROVED" | "ESCALATED" | "REJECTED";

export interface BuyingBrief {
  id: string;
  title: string;
  quantity: number;
  min_ram_gb: number | null;
  min_ssd_gb: number | null;
  max_unit_price_inr: number;
  max_delivery_days: number;
  requires_warranty: boolean;
  bulk_tier_qty: number | null;
  bulk_tier_price_inr: number | null;
  raw_text: string | null;
}

export interface Vendor {
  id: string;
  brief_id: string;
  name: string;
  unit_price_inr: number;
  ram_gb: number | null;
  ssd_gb: number | null;
  delivery_days: number;
  has_warranty: boolean;
  rating: number;
  return_window_days: number;
  gstin: string;
  in_stock: boolean;
  raw_listing_text: string;
  source: string;
}

export interface GstinCheck {
  gstin: string;
  structurally_valid: boolean;
  checksum_valid: boolean;
  state_code_valid: boolean;
  is_msme_udyam: boolean;
  verdict: boolean;
  detail: string;
}

export interface FirewallResult {
  vendor_id: string;
  passed: boolean;
  reasons_failed: string[];
}

export interface ScoredVendor {
  vendor: Vendor;
  price_score: number;
  reliability_score: number;
  delivery_score: number;
  return_score: number;
  total_score: number;
  rank: number;
}

export interface NegotiationResult {
  vendor_id: string;
  original_unit_price_inr: number;
  negotiated_unit_price_inr: number;
  bulk_tier_applied: boolean;
  savings_total_inr: number;
}

export interface ReplanEvent {
  brief_id: string;
  trigger: string;
  previous_vendor_id: string | null;
  new_vendor_id: string | null;
  succeeded: boolean;
  note: string;
}

export interface EscalationCardData {
  id: string;
  brief_id: string;
  reason: string;
  context: string;
  options: string[];
  resolved: boolean;
  resolution: string | null;
  resolved_at: string | null;
}

export interface AuditEntry {
  transaction_id: string;
  buying_brief_id: string;
  status: string;
  quantity: number;
  max_unit_budget_inr: number;
  max_delivery_days: number;
  evaluated_vendors_count: number;
  excluded_vendors: { vendor_id: string; passed: boolean; reasons_failed: string[] }[];
  selected_vendor: string | null;
  unit_price: number | null;
  delivery_days: number | null;
  selection_reasoning: string;
  counterfactual_analysis: string;
  authorisation_status: AuthorisationStatus;
  security_events: string[];
  negotiation: NegotiationResult | null;
  replan_events: ReplanEvent[];
  timestamp: string;
  audit_hash: string;
}

export interface BriefResult {
  ranked: ScoredVendor[];
  firewall_results: FirewallResult[];
  gstin_checks: GstinCheck[];
  security_events: string[];
  replan_events: ReplanEvent[];
  negotiation: NegotiationResult | null;
  overage_inr: number;
  bulk_savings_inr: number;
  vendors: Record<string, Vendor>;
}

export interface BriefSummary {
  brief: BuyingBrief;
  result: BriefResult;
  audit_entry: AuditEntry;
  escalation: EscalationCardData | null;
}

export interface PoolState {
  total_inr: number;
  allocated_inr: number;
  surplus_bank_inr: number;
  net_surplus_returned_inr: number;
  remaining_inr: number;
  log: string[];
}

export interface PipelineResult {
  pool: PoolState;
  briefs: BriefSummary[];
  escalations: EscalationCardData[];
}

export interface HealthResponse {
  status: string;
  llm_available: boolean;
}

/** Brief status as shown in the UI — derived from audit_entry + escalation,
 * not a literal backend field (the backend only knows AUTO_APPROVED /
 * ESCALATED / REJECTED + a status string). */
export type BriefUiStatus =
  | "Discovering"
  | "Evaluating"
  | "Escalated"
  | "Ready"
  | "Purchased";

export function briefUiStatus(summary: BriefSummary): BriefUiStatus {
  const { audit_entry } = summary;
  if (audit_entry.authorisation_status === "ESCALATED") return "Escalated";
  if (audit_entry.status === "PURCHASE_CONFIRMED_MOCK") return "Purchased";
  if (audit_entry.selected_vendor) return "Ready";
  return "Evaluating";
}
