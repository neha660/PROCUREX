"""
End-to-End Orchestration (Section B, Slide 4) + Authorisation logic
(Section D, Slide 9) + Dynamic Re-Planning (Section G, Slide 10) +
Duplicate-Purchase Detection (Slide 11) + Business Justification Gate
(new — misuse prevention).

This is the state machine. It calls the Code Layer modules in the order
shown in the architecture diagram and is the only place that assembles
an AuditEntry and decides AUTO_APPROVED vs ESCALATED vs REJECTED.

Pipeline order per brief:
  Intake -> Business Justification Gate -> Vendor Discovery -> Sanitizer
  -> Constraint Firewall -> Scorer -> Negotiation -> Authorisation
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime

from . import audit, vendor_data
from .budget import PoolLedger, new_pool
from .firewall import run_trust_and_firewall
from .governance import check_business_justification
from .llm import generate_counterfactual, generate_selection_reasoning
from .negotiator import negotiate
from .scorer import score_vendors
from .schemas import (
    AuditEntry,
    AuthorisationStatus,
    BuyingBrief,
    EscalationCard,
    NegotiationResult,
    ReplanEvent,
    ScoredVendor,
)

# Vendors knocked out mid-demo via the "simulate outage" endpoint.
_UNAVAILABLE_VENDOR_IDS: set[str] = set()

ESCALATIONS: dict[str, EscalationCard] = {}

# Escalation resolutions, keyed by brief_id — NOT cleared by run_full_pipeline.
# run_full_pipeline() rebuilds ESCALATIONS from scratch on every call (new
# random card ids each time), so without this a resolved escalation would
# silently flip back to "open" the moment the dashboard reloads the
# pipeline after the person clicked Approve/Reject. This is what actually
# makes a resolution stick.
_RESOLUTIONS: dict[str, dict] = {}


def mark_vendor_unavailable(vendor_id: str) -> None:
    _UNAVAILABLE_VENDOR_IDS.add(vendor_id)


def reset_outages() -> None:
    _UNAVAILABLE_VENDOR_IDS.clear()


def reset_resolutions() -> None:
    _RESOLUTIONS.clear()


def resolve_escalation(escalation_id: str, resolution: str) -> EscalationCard | None:
    """Resolves an escalation by its current-run id, AND records the
    resolution against its brief_id so it survives the next pipeline
    rebuild. Returns the updated card, or None if the id isn't live."""
    card = ESCALATIONS.get(escalation_id)
    if not card:
        return None
    resolved_at = datetime.utcnow()
    card.resolved = True
    card.resolution = resolution
    card.resolved_at = resolved_at
    _RESOLUTIONS[card.brief_id] = {"resolution": resolution, "resolved_at": resolved_at}
    return card


@dataclass
class BriefRunResult:
    brief: BuyingBrief
    governance_reason: str | None = None
    firewall_results: list[dict] = field(default_factory=list)
    gstin_checks: list[dict] = field(default_factory=list)
    security_events: list[str] = field(default_factory=list)
    ranked: list[ScoredVendor] = field(default_factory=list)
    winner: ScoredVendor | None = None
    negotiation: NegotiationResult | None = None
    replan_events: list[ReplanEvent] = field(default_factory=list)
    actual_spend_inr: float = 0.0
    overage_inr: float = 0.0
    bulk_savings_inr: float = 0.0
    all_vendors: dict = field(default_factory=dict)  # vendor_id -> vendor dict (pass or fail)


def _evaluate_brief(brief: BuyingBrief) -> BriefRunResult:
    result = BriefRunResult(brief=brief)

    # ---- Business Justification Gate — runs BEFORE vendor discovery.
    # If a brief isn't tied to an approved cost center, there is no point
    # spending a vendor search or an LLM call on it; it's held for a
    # Finance Manager regardless of what a vendor search would find.
    gov = check_business_justification(brief, vendor_data.COST_CENTERS)
    if not gov.passed:
        result.governance_reason = gov.reason
        return result

    candidates = vendor_data.vendors_for_brief(brief.id)

    passed_vendors = []
    for vendor in candidates:
        live_vendor = vendor.model_copy()
        if live_vendor.id in _UNAVAILABLE_VENDOR_IDS:
            live_vendor.in_stock = False

        fw_result, gstin_check, sec_events = run_trust_and_firewall(brief, live_vendor)
        result.firewall_results.append(fw_result.model_dump())
        result.gstin_checks.append(gstin_check)
        result.security_events.extend(sec_events)
        result.all_vendors[live_vendor.id] = live_vendor.model_dump()
        if fw_result.passed:
            passed_vendors.append(live_vendor)

    result.ranked = score_vendors(brief, passed_vendors)

    # ---- Dynamic re-planning (Slide 10): walk the ranked list until we
    # find a vendor that's actually in stock. Every vendor we skip over
    # because it went unavailable mid-flow gets an explicit ReplanEvent,
    # so the audit trail shows the state machine re-planned on its own
    # instead of silently landing on whichever vendor happened to be left.
    previous_id: str | None = None
    first_unavailable_name = None
    chosen: ScoredVendor | None = None
    for candidate in result.ranked:
        is_available = candidate.vendor.id not in _UNAVAILABLE_VENDOR_IDS
        if is_available:
            if previous_id is not None:
                result.replan_events.append(
                    ReplanEvent(
                        brief_id=brief.id,
                        trigger="Selected vendor went out of stock mid-flow.",
                        previous_vendor_id=previous_id,
                        new_vendor_id=candidate.vendor.id,
                        succeeded=True,
                        note=(
                            f"Auto-selected #{candidate.rank}-ranked vendor "
                            f"'{candidate.vendor.name}' — no human touch needed."
                        ),
                    )
                )
            chosen = candidate
            break
        else:
            if previous_id is None:
                previous_id = candidate.vendor.id
                first_unavailable_name = candidate.vendor.name

    if chosen is None and result.ranked and any(
        s.vendor.id in _UNAVAILABLE_VENDOR_IDS for s in result.ranked
    ):
        result.replan_events.append(
            ReplanEvent(
                brief_id=brief.id,
                trigger=f"Top vendor '{first_unavailable_name}' went out of stock mid-flow.",
                previous_vendor_id=previous_id,
                new_vendor_id=None,
                succeeded=False,
                note="No compliant fallback vendor exists in the remaining pool.",
            )
        )

    result.ranked = [s for s in result.ranked if s.vendor.id not in _UNAVAILABLE_VENDOR_IDS]

    if not chosen:
        return result

    result.winner = chosen
    result.negotiation = negotiate(brief, result.winner.vendor)

    unit_price_after_negotiation = result.negotiation.negotiated_unit_price_inr
    result.actual_spend_inr = unit_price_after_negotiation * brief.quantity
    result.overage_inr = max(0.0, result.actual_spend_inr - brief.total_budget_inr)

    if result.negotiation.bulk_tier_applied:
        result.bulk_savings_inr = max(0.0, brief.total_budget_inr - result.actual_spend_inr)

    return result


def _closest_miss_analysis(
    brief: BuyingBrief, firewall_results: list[dict], all_vendors: dict
) -> str:
    """Robustness case from Slide 11: when no vendor clears every hard
    constraint, report the closest miss instead of a flat "nothing
    qualified". Only considers vendors that actually reached the hard
    filter (i.e. passed the GSTIN trust gate and the data-quality gate) —
    a vendor excluded before that point was never a genuine near-miss."""
    from .schemas import VendorExclusionReason as R

    trust_layer_only = {R.INVALID_GSTIN.value, R.DATA_QUALITY.value}

    candidates = []
    for fw in firewall_results:
        if fw["passed"]:
            continue
        reasons = fw["reasons_failed"]
        if any(r in trust_layer_only for r in reasons):
            continue  # never reached the hard filter — not a "close miss"
        candidates.append((fw["vendor_id"], reasons))

    if not candidates:
        return (
            "No vendor came close — every candidate was excluded at the vendor-trust "
            "layer (invalid GSTIN or incomplete listing data) before hard-filtering "
            "could even run."
        )

    candidates.sort(key=lambda c: len(c[1]))
    closest_id, closest_reasons = candidates[0]

    if len(closest_reasons) > 1:
        vendor_name = all_vendors.get(closest_id, {}).get("name", closest_id)
        return (
            f"Closest miss: '{vendor_name}' failed {len(closest_reasons)} constraints "
            f"({', '.join(closest_reasons)}) — no single relaxed rule would qualify it."
        )

    vendor = all_vendors.get(closest_id, {})
    vendor_name = vendor.get("name", closest_id)
    reason = closest_reasons[0]

    if reason == R.DELIVERY_SLA_MISSED.value:
        return (
            f"Closest miss: '{vendor_name}' would qualify if the delivery SLA were "
            f"relaxed from {brief.max_delivery_days} to {vendor.get('delivery_days')} "
            f"days — every other constraint is already met."
        )
    if reason == R.SPEC_MISMATCH.value:
        gaps = []
        if brief.min_ram_gb and (vendor.get("ram_gb") or 0) < brief.min_ram_gb:
            gaps.append(f"RAM {vendor.get('ram_gb')}GB vs {brief.min_ram_gb}GB required")
        if brief.min_ssd_gb and (vendor.get("ssd_gb") or 0) < brief.min_ssd_gb:
            gaps.append(f"SSD {vendor.get('ssd_gb')}GB vs {brief.min_ssd_gb}GB required")
        return (
            f"Closest miss: '{vendor_name}' would qualify if the spec were relaxed — "
            f"{'; '.join(gaps)} — every other constraint is already met."
        )
    if reason == R.WARRANTY_MISSING.value:
        return (
            f"Closest miss: '{vendor_name}' would qualify if the warranty requirement "
            f"were waived — every other constraint is already met."
        )

    return f"Closest miss: '{vendor_name}' failed on: {reason}."


def _build_escalation(brief: BuyingBrief, reason: str, context: str) -> EscalationCard:
    card = EscalationCard(
        id=f"ESC-{uuid.uuid4().hex[:8].upper()}",
        brief_id=brief.id,
        reason=reason,
        context=context,
    )
    prior = _RESOLUTIONS.get(brief.id)
    if prior:
        card.resolved = True
        card.resolution = prior["resolution"]
        card.resolved_at = prior["resolved_at"]
    ESCALATIONS[card.id] = card
    return card


def _normalize_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", title.lower())


def _find_duplicate_brief_ids(briefs: list[BuyingBrief]) -> dict[str, str]:
    """Duplicate-purchase detection (Slide 11): flags briefs that request
    the *same thing* — matching title, quantity, unit-price cap, and
    delivery window — as an already-seen brief in the same run. This is
    the "two people on a team accidentally submit the same buying brief"
    case, not just two briefs that happen to be similarly priced.

    Returns {duplicate_brief_id: original_brief_id}. The first brief in
    each matching group is treated as the canonical one; every later
    match in the same run is flagged.
    """
    seen: dict[tuple, str] = {}
    duplicates: dict[str, str] = {}

    for b in briefs:
        key = (
            _normalize_title(b.title),
            b.quantity,
            b.max_unit_price_inr,
            b.max_delivery_days,
        )
        if key in seen:
            duplicates[b.id] = seen[key]
        else:
            seen[key] = b.id

    return duplicates


def run_full_pipeline() -> dict:
    """Runs every current brief through the full pipeline, including the
    shared-budget reallocation walkthrough from Slide 8, and writes
    audit entries for each. Returns a UI-ready summary dict."""
    audit.clear()
    ESCALATIONS.clear()

    briefs = vendor_data.BRIEFS
    pool = new_pool(vendor_data.SHARED_POOL_TOTAL_INR)

    per_brief: dict[str, BriefRunResult] = {b.id: _evaluate_brief(b) for b in briefs}
    duplicate_of = _find_duplicate_brief_ids(briefs)

    # Phase 1 — bank every brief's negotiated RFQ savings into the shared pool
    # (skip duplicates and governance-blocked briefs — neither actually spends)
    for b in briefs:
        r = per_brief[b.id]
        if r.bulk_savings_inr > 0 and b.id not in duplicate_of and not r.governance_reason:
            pool.bank_surplus(
                b.id, r.bulk_savings_inr, f"Bulk RFQ negotiation on '{b.title}'"
            )

    # Phase 2 — resolve overages, drawing on banked surplus before escalating
    summaries = []
    for b in briefs:
        r = per_brief[b.id]
        escalation = None
        governance_flag = None

        if r.governance_reason:
            # Business Justification Gate failed — this brief never even
            # reached vendor discovery. Always escalated, never rejected
            # outright, because a legitimate new cost center and someone
            # gaming the system look identical to code; only a Finance
            # Manager can tell them apart.
            status = AuthorisationStatus.ESCALATED
            governance_flag = r.governance_reason
            escalation = _build_escalation(
                b,
                reason=f"Business justification check failed: {r.governance_reason}",
                context=(
                    "This brief was held before vendor discovery even ran. Requested by "
                    f"'{b.requested_by}' against cost center '{b.cost_center}'. A Finance "
                    "Manager must confirm this is a legitimate company purchase before "
                    "any vendor is searched."
                ),
            )
            reasoning = "Held at intake — business justification could not be verified."
            counterfactual = "N/A — flagged before vendor discovery or scoring ran."
        elif b.id in duplicate_of:
            # Duplicate-purchase detection overrides everything else: this
            # brief matches one already authorised in the same run, so it
            # never touches the pool — it always escalates for a human to
            # confirm it's intentional (a genuine reorder) rather than an
            # accidental double submission.
            original_id = duplicate_of[b.id]
            status = AuthorisationStatus.ESCALATED
            escalation = _build_escalation(
                b,
                reason=f"Possible duplicate of {original_id} — same items, quantity, and budget cap.",
                context=(
                    f"This brief matches an already-authorised brief ({original_id}) in this run: "
                    "identical title, quantity, unit-price cap, and delivery window. Flagged instead "
                    "of auto-approved in case two people submitted the same request independently."
                ),
            )
            reasoning = f"Held for review — matches brief {original_id} submitted in the same run."
            counterfactual = "N/A — flagged as a possible duplicate before vendor scoring was used to decide."
        elif not r.winner:
            status = AuthorisationStatus.ESCALATED
            closest_miss = _closest_miss_analysis(b, r.firewall_results, r.all_vendors)
            escalation = _build_escalation(
                b,
                reason="No vendor cleared every hard constraint (or no fallback exists).",
                context=(
                    "All candidate vendors were excluded by the constraint firewall, "
                    "GSTIN trust gate, or went out of stock with no compliant fallback. "
                    + closest_miss
                ),
            )
            reasoning = f"No compliant vendor available; escalated for manual sourcing. {closest_miss}"
            counterfactual = "N/A — no vendor passed the hard-constraint firewall."
        else:
            covered = True
            drawn = 0.0
            if r.overage_inr > 0:
                covered, drawn = pool.try_cover_overage(b.id, r.overage_inr)

            reasoning = generate_selection_reasoning(b, r.ranked)
            counterfactual = generate_counterfactual(b, r.ranked, r.winner)

            if covered:
                status = AuthorisationStatus.AUTO_APPROVED
                pool.record_spend(b.id, r.actual_spend_inr)
            else:
                status = AuthorisationStatus.ESCALATED
                remaining_gap = r.overage_inr - drawn
                escalation = _build_escalation(
                    b,
                    reason=f"Overage of ₹{remaining_gap:,.0f} remains after RFQ + shared-pool reallocation.",
                    context=(
                        f"Selected vendor '{r.winner.vendor.name}' at "
                        f"₹{r.negotiation.negotiated_unit_price_inr:,.0f}/unit exceeds the "
                        f"₹{b.max_unit_price_inr:,.0f} cap by more than the shared pool can absorb."
                    ),
                )

        entry = audit.record(
            AuditEntry(
                transaction_id=audit.next_transaction_id(b.id),
                buying_brief_id=b.id,
                status=(
                    "PURCHASE_CONFIRMED_MOCK"
                    if status == AuthorisationStatus.AUTO_APPROVED
                    else "PENDING_ESCALATION"
                ),
                quantity=b.quantity,
                max_unit_budget_inr=b.max_unit_price_inr,
                max_delivery_days=b.max_delivery_days,
                evaluated_vendors_count=len(r.firewall_results),
                excluded_vendors=[
                    fw for fw in r.firewall_results if not fw["passed"]
                ],
                selected_vendor=r.winner.vendor.name if r.winner else None,
                unit_price=(
                    r.negotiation.negotiated_unit_price_inr if r.negotiation else None
                ),
                delivery_days=r.winner.vendor.delivery_days if r.winner else None,
                selection_reasoning=reasoning,
                counterfactual_analysis=counterfactual,
                authorisation_status=status,
                security_events=r.security_events,
                negotiation=r.negotiation,
                replan_events=r.replan_events,
                requested_by=b.requested_by,
                cost_center=b.cost_center,
                governance_flag=governance_flag,
            )
        )

        summaries.append(
            {
                "brief": b.model_dump(),
                "result": {
                    "governance_reason": r.governance_reason,
                    "ranked": [s.model_dump() for s in r.ranked],
                    "firewall_results": r.firewall_results,
                    "gstin_checks": r.gstin_checks,
                    "security_events": r.security_events,
                    "replan_events": [e.model_dump() for e in r.replan_events],
                    "negotiation": r.negotiation.model_dump() if r.negotiation else None,
                    "overage_inr": r.overage_inr,
                    "bulk_savings_inr": r.bulk_savings_inr,
                    "vendors": r.all_vendors,
                },
                "audit_entry": entry.model_dump(),
                "escalation": escalation.model_dump() if escalation else None,
            }
        )

    return {
        "pool": {
            "total_inr": pool.pool.total_inr,
            "allocated_inr": pool.pool.allocated_inr,
            "surplus_bank_inr": pool.surplus_bank_inr,
            "net_surplus_returned_inr": pool.net_surplus_returned(),
            "remaining_inr": pool.pool.total_inr - pool.pool.allocated_inr + pool.surplus_bank_inr,
            "log": pool.log,
        },
        "briefs": summaries,
        "escalations": [e.model_dump() for e in ESCALATIONS.values()],
    }
