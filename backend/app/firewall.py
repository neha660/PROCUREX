"""
Zero-Trust Constraint Firewall (Section B/C, Slides 3, 5, 6, 7).

This is the Code Layer. It is the ONLY place authorisation-relevant
pass/fail decisions get made. The LLM layer (llm.py) never touches this —
it only writes human-readable reasoning *about* a decision this module
already made deterministically.

Order of operations mirrors the deck exactly:
  1. Sanitize untrusted vendor text (sanitizer.py) — regex-based,
     catches literal injection syntax
  1b. Semantic manipulation check (llm.py) — a second, independent
     layer over the SAME raw text, catching rephrased attempts the
     regex above would miss. Purely advisory: it can only ever add a
     security_events entry (prefixed "[AI-flagged]", vs. the regex
     layer's "[Pattern-matched]") — it can never touch reasons/passed
     below, by construction (see llm.assess_manipulation_risk).
  2. Vendor Trust Layer — GSTIN structural/checksum + MSME flag (gstin.py)
  3. Stage 1 hard filter — price, spec, delivery SLA, warranty
A vendor failing step 2 never reaches step 3 ("never reaches the vendor
comparison table" — Slide 7).
"""
from __future__ import annotations

from .schemas import BuyingBrief, Vendor, FirewallResult, VendorExclusionReason
from .gstin import validate_gstin
from .sanitizer import sanitize_vendor_text
from .llm import assess_manipulation_risk


def run_trust_and_firewall(
    brief: BuyingBrief, vendor: Vendor
) -> tuple[FirewallResult, dict, list[str]]:
    """Returns (firewall_result, gstin_check_dict, security_events)."""
    security_events: list[str] = []
    reasons: list[str] = []

    # GSTIN check runs unconditionally so every vendor always has a real
    # trust-layer record in the response, even one later excluded on
    # data-quality grounds. is_msme is the vendor's own Udyam registration
    # claim — structural only, not verified against a live government
    # registry (Slide 12's stated Round 1 limitation), but surfaced for
    # vendor-diversity reporting per Slide 7.
    gstin_check = validate_gstin(vendor.gstin, claimed_msme=vendor.is_msme)

    # Step 0 — data-quality gate: a vendor with no listing text and no
    # named source isn't a compliance failure in the usual sense, it's
    # simply not evaluable. Excluded outright, with a distinct reason,
    # rather than silently treated as a pass because every hard
    # constraint happens to be technically unset (Slide 11).
    no_listing = not vendor.raw_listing_text.strip()
    no_source = vendor.source.strip().lower() in ("", "unknown")
    if no_listing and no_source:
        reasons.append(VendorExclusionReason.DATA_QUALITY.value)
        return (
            FirewallResult(vendor_id=vendor.id, passed=False, reasons_failed=reasons),
            gstin_check.model_dump(),
            security_events,
        )

    # Step 1 — sanitize before anything else touches this text
    sanitized = sanitize_vendor_text(vendor.raw_listing_text)
    if sanitized.injection_detected:
        security_events.append(
            f"[Pattern-matched] Prompt-injection attempt stripped from vendor "
            f"'{vendor.name}' listing: {sanitized.stripped_fragments}"
        )

    # Step 1b — independent, purely-advisory AI layer over the SAME raw
    # text: semantically judges intent instead of matching literal
    # syntax, so it can catch a manipulation attempt phrased with no
    # brackets and no exact regex match at all. This can only ever
    # append to security_events below — nothing here can reach `reasons`
    # or `passed`, by construction (see llm.assess_manipulation_risk's
    # docstring for why that boundary matters).
    manipulation = assess_manipulation_risk(vendor.name, vendor.raw_listing_text)
    if manipulation["flagged"]:
        security_events.append(
            f"[AI-flagged] Possible manipulation attempt in vendor "
            f"'{vendor.name}' listing: {manipulation['reasoning']}"
        )

    # Step 2 — vendor trust layer gate (runs BEFORE scoring eligibility)
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

    passed = len(reasons) == 0
    return (
        FirewallResult(vendor_id=vendor.id, passed=passed, reasons_failed=reasons),
        gstin_check.model_dump(),
        security_events,
    )
