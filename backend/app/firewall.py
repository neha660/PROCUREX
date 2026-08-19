"""
Zero-Trust Constraint Firewall (Section B/C, Slides 3, 5, 6, 7).

This is the Code Layer. It is the ONLY place authorisation-relevant
pass/fail decisions get made. The LLM layer (llm.py) never touches this —
it only writes human-readable reasoning *about* a decision this module
already made deterministically.

Order of operations mirrors the deck exactly:
  1. Sanitize untrusted vendor text (sanitizer.py)
  2. Vendor Trust Layer — GSTIN structural/checksum + MSME flag (gstin.py)
  3. Stage 1 hard filter — price, spec, delivery SLA, warranty
A vendor failing step 2 never reaches step 3 ("never reaches the vendor
comparison table" — Slide 7).
"""
from __future__ import annotations

from .schemas import BuyingBrief, Vendor, FirewallResult, VendorExclusionReason
from .gstin import validate_gstin
from .sanitizer import sanitize_vendor_text


def run_trust_and_firewall(
    brief: BuyingBrief, vendor: Vendor
) -> tuple[FirewallResult, dict, list[str]]:
    """Returns (firewall_result, gstin_check_dict, security_events)."""
    security_events: list[str] = []
    reasons: list[str] = []

    # Step 1 — sanitize before anything else touches this text
    sanitized = sanitize_vendor_text(vendor.raw_listing_text)
    if sanitized.injection_detected:
        security_events.append(
            f"Prompt-injection attempt stripped from vendor '{vendor.name}' "
            f"listing: {sanitized.stripped_fragments}"
        )

    # Step 2 — vendor trust layer (GSTIN gate runs BEFORE scoring eligibility)
    gstin_check = validate_gstin(vendor.gstin)
    if not gstin_check.verdict:
        reasons.append(VendorExclusionReason.INVALID_GSTIN.value)
        # Fails fast — no need to run the rest of the hard filter
        return (
            FirewallResult(vendor_id=vendor.id, passed=False, reasons_failed=reasons),
            gstin_check.model_dump(),
            security_events,
        )

    # NOTE: stock availability is intentionally NOT checked here. It is a
    # supply-side/timing condition, not a compliance failure, so it's
    # handled separately by the planner's Dynamic Re-Planning step
    # (Slide 10) rather than being silently folded into "excluded vendors".

    # Step 3 — Stage 1 hard filter: spec / delivery-SLA / warranty are
    # absolute deterministic constraints, discarded outright, no partial
    # credit (Slide 6). Price is deliberately NOT filtered here — a vendor
    # over the per-unit cap still gets scored and ranked; whether it can
    # actually be purchased is decided later by the Authorisation Scope
    # Check + shared-budget reallocation (Slides 8-9), which is exactly
    # how the LED-screen price-spike gets auto-resolved instead of being
    # silently discarded.
    if brief.min_ram_gb and (vendor.ram_gb or 0) < brief.min_ram_gb:
        reasons.append(VendorExclusionReason.SPEC_MISMATCH.value)

    if brief.min_ssd_gb and (vendor.ssd_gb or 0) < brief.min_ssd_gb:
        reasons.append(VendorExclusionReason.SPEC_MISMATCH.value)

    if vendor.delivery_days > brief.max_delivery_days:
        reasons.append(VendorExclusionReason.DELIVERY_SLA_MISSED.value)

    if brief.requires_warranty and not vendor.has_warranty:
        reasons.append(VendorExclusionReason.WARRANTY_MISSING.value)

    # A vendor can fail both the RAM and SSD checks, which both map to the
    # same VendorExclusionReason — dedupe (preserving order) so the audit
    # trail doesn't repeat "Does not meet minimum spec" twice.
    reasons = list(dict.fromkeys(reasons))

    passed = len(reasons) == 0
    return (
        FirewallResult(vendor_id=vendor.id, passed=passed, reasons_failed=reasons),
        gstin_check.model_dump(),
        security_events,
    )
