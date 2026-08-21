"""
Shared Budget Allocator (Section A/C/D, Slides 2, 8, 9).

Treats all buying briefs as draws against ONE shared pool rather than
isolated per-brief approvals. When a vendor's negotiated price still
exceeds a brief's own per-unit cap, this module checks whether savings
banked from OTHER briefs (e.g. a bulk-tier win) can absorb the gap before
anything gets escalated to a human — exactly the ₹27,000 LED overage /
₹30,000 hoodie saving trade from Slide 8.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .schemas import BuyingBrief, BudgetPool


@dataclass
class PoolLedger:
    pool: BudgetPool
    surplus_bank_inr: float = 0.0
    log: list[str] = field(default_factory=list)

    def bank_surplus(self, brief_id: str, amount_inr: float, reason: str) -> None:
        if amount_inr <= 0:
            return
        self.surplus_bank_inr += amount_inr
        self.pool.saved_inr += amount_inr
        self.log.append(
            f"[{brief_id}] Banked ₹{amount_inr:,.0f} surplus into shared pool — {reason}"
        )

    def try_cover_overage(self, brief_id: str, overage_inr: float) -> tuple[bool, float]:
        """Attempt to auto-resolve an overage using banked surplus from other
        briefs. Returns (covered, amount_drawn_from_bank)."""
        if overage_inr <= 0:
            return True, 0.0
        if self.surplus_bank_inr >= overage_inr:
            self.surplus_bank_inr -= overage_inr
            self.log.append(
                f"[{brief_id}] Drew ₹{overage_inr:,.0f} from shared-pool surplus "
                f"to auto-resolve overage — no escalation needed."
            )
            return True, overage_inr
        drawn = self.surplus_bank_inr
        self.surplus_bank_inr = 0.0
        self.log.append(
            f"[{brief_id}] Shared-pool surplus (₹{drawn:,.0f}) insufficient to cover "
            f"₹{overage_inr:,.0f} overage — remaining gap requires escalation."
        )
        return False, drawn

    def record_spend(self, brief_id: str, amount_inr: float) -> None:
        self.pool.allocated_inr += amount_inr
        self.pool.briefs[brief_id] = self.pool.briefs.get(brief_id, 0) + amount_inr

    def net_surplus_returned(self) -> float:
        """Whatever is left banked and unspent at the end of a full run."""
        return round(self.surplus_bank_inr, 2)


def new_pool(total_inr: float) -> PoolLedger:
    return PoolLedger(pool=BudgetPool(total_inr=total_inr))
