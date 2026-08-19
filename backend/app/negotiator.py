"""
Simulated RFQ / Negotiation (Slide 4 stage, demoed concretely on Slide 8).

If a brief defines a bulk-tier threshold and the requested quantity meets
it, the negotiator applies the negotiated bulk price and reports the
savings — deterministically, no LLM involved. This is what turns the
Brief #3 hoodie order from ₹800/unit into ₹740/unit in the shared-budget
walkthrough.
"""
from __future__ import annotations

from .schemas import BuyingBrief, Vendor, NegotiationResult


def negotiate(brief: BuyingBrief, vendor: Vendor) -> NegotiationResult:
    bulk_applies = (
        brief.bulk_tier_qty is not None
        and brief.bulk_tier_price_inr is not None
        and brief.quantity >= brief.bulk_tier_qty
    )
    negotiated_price = brief.bulk_tier_price_inr if bulk_applies else vendor.unit_price_inr
    savings = (vendor.unit_price_inr - negotiated_price) * brief.quantity if bulk_applies else 0.0

    return NegotiationResult(
        vendor_id=vendor.id,
        original_unit_price_inr=vendor.unit_price_inr,
        negotiated_unit_price_inr=negotiated_price,
        bulk_tier_applied=bulk_applies,
        savings_total_inr=round(savings, 2),
    )
