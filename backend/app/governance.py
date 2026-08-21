"""
Business Justification Gate — runs immediately after Buying Brief Intake,
before Vendor Discovery even starts (see the pipeline order in
planner.py). This is the answer to "how do we stop someone using this
for a personal purchase": every brief must declare who requested it and
which approved company budget line (cost center) it draws against.

This is deliberately a separate, earlier stage from the vendor
Constraint Firewall (firewall.py) — vendor legitimacy and *purchase*
legitimacy are different questions, and the deck's own architecture
already treats each pipeline stage as a distinct, separately-testable
gate.

Design choice: an unapproved or missing cost-center never silently
blocks the brief (REJECTED) and never silently lets it through
(AUTO_APPROVED) — it always routes to a human Finance Manager. A
brand-new legitimate cost-center (a real new project) and someone
gaming the system both look identical to the code at this point; only
a person can tell them apart. The code's job is only to guarantee the
question always gets asked.
"""
from __future__ import annotations

from .schemas import BuyingBrief, CostCenter


class GovernanceResult:
    def __init__(self, passed: bool, reason: str | None = None):
        self.passed = passed
        self.reason = reason


def check_business_justification(
    brief: BuyingBrief, approved_cost_centers: list[CostCenter]
) -> GovernanceResult:
    active_codes = {c.code for c in approved_cost_centers if c.active}

    if not brief.requested_by or brief.requested_by.strip().lower() in ("", "unknown requester"):
        return GovernanceResult(
            passed=False,
            reason="No requester identified on this brief — every purchase must be attributable to a person.",
        )

    if brief.cost_center not in active_codes:
        return GovernanceResult(
            passed=False,
            reason=(
                f"Cost center '{brief.cost_center}' is not on the approved list — "
                "this brief isn't tied to a recognised company budget line."
            ),
        )

    return GovernanceResult(passed=True)
