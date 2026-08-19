"""
End-to-End Orchestration (Section B, Slide 4) + Authorisation logic
(Section D, Slide 9) + Dynamic Re-Planning (Section G, Slide 10).

This is the state machine. It calls the Code Layer modules in the order
shown in the architecture diagram and is the only place that assembles
an AuditEntry and decides AUTO_APPROVED vs ESCALATED vs REJECTED.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from . import audit, vendor_data
from .budget import PoolLedger, new_pool
from .firewall import run_trust_and_firewall
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


def mark_vendor_unavailable(vendor_id: str) -> None:
    _UNAVAILABLE_VENDOR_IDS.add(vendor_id)


def reset_outages() -> None:
    _UNAVAILABLE_VENDOR_IDS.clear()
    ESCALATIONS.clear()


@dataclass
class BriefRunResult:
    brief: BuyingBrief
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
    chosen: ScoredVendor | None = None
    for candidate in result.ranked:
        is_available = candidate.vendor.id not in _UNAVAILABLE_VENDOR_IDS
        if is_available:
            if previous_id is not None:
                result.replan_events.append(
                    ReplanEvent(
                        brief_id=brief.id,
                        trigger=f"Selected vendor went out of stock mid-flow.",
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


def _build_escalation(brief: BuyingBrief, reason: str, context: str) -> EscalationCard:
    """Idempotent per brief: re-running the pipeline (e.g. a routine
    dashboard refresh) must never silently revert a human's decision back
    to 'open', so if this brief already has an escalation card — resolved
    or not — it's reused rather than replaced. A brand-new card is only
    minted the first time a given brief needs one."""
    existing = next((c for c in ESCALATIONS.values() if c.brief_id == brief.id), None)
    if existing:
        return existing

    card = EscalationCard(
        id=f"ESC-{uuid.uuid4().hex[:8].upper()}",
        brief_id=brief.id,
        reason=reason,
        context=context,
    )
    ESCALATIONS[card.id] = card
    return card


def run_full_pipeline() -> dict:
    """Runs all three briefs through the full pipeline, including the
    shared-budget reallocation walkthrough from Slide 8, and writes
    audit entries for each. Returns a UI-ready summary dict.

    Escalations deliberately persist across runs (see _build_escalation) —
    only reset_outages() clears them, since that's the action that actually
    changes the underlying situation a human resolved."""
    audit.clear()

    briefs = vendor_data.BRIEFS
    pool = new_pool(vendor_data.SHARED_POOL_TOTAL_INR)

    per_brief: dict[str, BriefRunResult] = {b.id: _evaluate_brief(b) for b in briefs}

    # Phase 1 — bank every brief's negotiated RFQ savings into the shared pool
    for b in briefs:
        r = per_brief[b.id]
        if r.bulk_savings_inr > 0:
            pool.bank_surplus(
                b.id, r.bulk_savings_inr, f"Bulk RFQ negotiation on '{b.title}'"
            )

    # Phase 2 — resolve overages, drawing on banked surplus before escalating
    summaries = []
    for b in briefs:
        r = per_brief[b.id]
        escalation = None

        if not r.winner:
            status = AuthorisationStatus.ESCALATED
            escalation = _build_escalation(
                b,
                reason="No vendor cleared every hard constraint (or no fallback exists).",
                context=(
                    "All candidate vendors were excluded by the constraint firewall, "
                    "GSTIN trust gate, or went out of stock with no compliant fallback."
                ),
            )
            reasoning = "No compliant vendor available; escalated for manual sourcing."
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
            )
        )

        summaries.append(
            {
                "brief": b.model_dump(),
                "result": {
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
            # NOTE: surplus_bank_inr is already part of (total - allocated) —
            # it's unspent money, just earmarked as reusable slack — so it
            # must not be added a second time here.
            "remaining_inr": pool.pool.total_inr - pool.pool.allocated_inr,
            "log": pool.log,
        },
        "briefs": summaries,
        "escalations": [e.model_dump() for e in ESCALATIONS.values()],
    }
