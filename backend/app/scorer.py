"""
Stage 2 — Weighted Sum Model (Slide 6).

Weights are fixed, per the deck's stated limitation ("Fixed scoring weights
per category" — Slide 12): Price 40%, Reliability & Warranty 30%,
Delivery Time 20%, Return/Refund Policy 10%. Only vendors that already
passed the Stage 1 hard filter are scored — no partial credit for a vendor
that failed a hard constraint.
"""
from __future__ import annotations

from .schemas import BuyingBrief, Vendor, ScoredVendor

WEIGHTS = {
    "price": 0.40,
    "reliability": 0.30,
    "delivery": 0.20,
    "returns": 0.10,
}


def _normalize(value: float, best: float, worst: float, higher_is_better: bool) -> float:
    """Map a raw value to a 0-100 score relative to the vendor pool's range."""
    if best == worst:
        return 100.0
    if higher_is_better:
        return max(0.0, min(100.0, 100 * (value - worst) / (best - worst)))
    return max(0.0, min(100.0, 100 * (worst - value) / (worst - best)))


def score_vendors(brief: BuyingBrief, vendors: list[Vendor]) -> list[ScoredVendor]:
    if not vendors:
        return []

    prices = [v.unit_price_inr for v in vendors]
    ratings = [v.rating + (1.0 if v.has_warranty else 0.0) for v in vendors]
    deliveries = [v.delivery_days for v in vendors]
    returns = [v.return_window_days for v in vendors]

    p_best, p_worst = min(prices), max(prices)
    r_best, r_worst = max(ratings), min(ratings)
    d_best, d_worst = min(deliveries), max(deliveries)
    ret_best, ret_worst = max(returns), min(returns)

    scored: list[ScoredVendor] = []
    for v in vendors:
        reliability_raw = v.rating + (1.0 if v.has_warranty else 0.0)
        price_score = _normalize(v.unit_price_inr, p_best, p_worst, higher_is_better=False)
        reliability_score = _normalize(reliability_raw, r_best, r_worst, higher_is_better=True)
        delivery_score = _normalize(v.delivery_days, d_best, d_worst, higher_is_better=False)
        return_score = _normalize(v.return_window_days, ret_best, ret_worst, higher_is_better=True)

        total = (
            price_score * WEIGHTS["price"]
            + reliability_score * WEIGHTS["reliability"]
            + delivery_score * WEIGHTS["delivery"]
            + return_score * WEIGHTS["returns"]
        )

        scored.append(
            ScoredVendor(
                vendor=v,
                price_score=round(price_score, 1),
                reliability_score=round(reliability_score, 1),
                delivery_score=round(delivery_score, 1),
                return_score=round(return_score, 1),
                total_score=round(total, 1),
            )
        )

    scored.sort(key=lambda s: s.total_score, reverse=True)
    for i, s in enumerate(scored, start=1):
        s.rank = i
    return scored
