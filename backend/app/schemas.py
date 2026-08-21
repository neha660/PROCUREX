"""
Pydantic schemas for ProcureX.

This is the single source of truth for what a "valid" brief, vendor,
score, or audit entry looks like. The Code Layer (firewall.py, scorer.py,
budget.py, planner.py) only ever operates on these validated objects —
never on raw LLM text. That boundary is the whole point of the
"LLM proposes, code decides" architecture from the deck.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AuthorisationStatus(str, Enum):
    AUTO_APPROVED = "AUTO_APPROVED"
    ESCALATED = "ESCALATED"
    REJECTED = "REJECTED"


class Role(str, Enum):
    """Role-based access, enforced server-side via an X-ProcureX-Role
    header (see main.py's require_role dependency). No login/session —
    this demonstrates the authorization *boundary* a production
    deployment would sit behind real auth, without the live-demo risk
    of a password/session system breaking on stage."""
    REQUESTER = "REQUESTER"
    FINANCE_MANAGER = "FINANCE_MANAGER"
    ADMIN = "ADMIN"


_ROLE_RANK = {Role.REQUESTER: 0, Role.FINANCE_MANAGER: 1, Role.ADMIN: 2}


def role_at_least(role: Role, minimum: Role) -> bool:
    return _ROLE_RANK[role] >= _ROLE_RANK[minimum]


class VendorExclusionReason(str, Enum):
    OVER_BUDGET = "Over budget cap"
    SPEC_MISMATCH = "Does not meet minimum spec"
    DELIVERY_SLA_MISSED = "Delivery exceeds SLA"
    WARRANTY_MISSING = "Warranty requirement not met"
    INVALID_GSTIN = "Invalid GSTIN — checksum mismatch"
    DATA_QUALITY = "Malformed or incomplete vendor data"
    OUT_OF_STOCK = "Vendor out of stock"


class BuyingBrief(BaseModel):
    """A single procurement request. In production this is produced by
    the LLM parsing a natural-language brief; the fields themselves are
    always validated here before anything downstream trusts them."""

    id: str
    title: str
    quantity: int = Field(gt=0)
    min_ram_gb: Optional[int] = None
    min_ssd_gb: Optional[int] = None
    max_unit_price_inr: float = Field(gt=0)
    max_delivery_days: int = Field(gt=0)
    requires_warranty: bool = False
    bulk_tier_qty: Optional[int] = None
    bulk_tier_price_inr: Optional[float] = None
    raw_text: Optional[str] = None

    # Governance fields — every brief must declare who it's for and which
    # approved company budget line it draws against. This is the gate that
    # keeps ProcureX from being usable for personal purchases: a brief
    # with no cost-center, or one not on the approved list, can never
    # reach AUTO_APPROVED — see governance.py.
    requested_by: str = Field(default="Unknown requester")
    cost_center: str = Field(default="UNSPECIFIED")

    @property
    def total_budget_inr(self) -> float:
        return self.max_unit_price_inr * self.quantity


class CostCenter(BaseModel):
    code: str
    label: str
    active: bool = True


class FinanceManagerRecord(BaseModel):
    id: str
    name: str
    email: str


class Vendor(BaseModel):
    """Raw vendor listing as scraped/returned by vendor discovery.
    Treated as UNTRUSTED input — see sanitizer.py."""

    id: str
    brief_id: str
    name: str
    unit_price_inr: float
    ram_gb: Optional[int] = None
    ssd_gb: Optional[int] = None
    delivery_days: int
    has_warranty: bool
    rating: float = Field(ge=0, le=5)
    return_window_days: int = 0
    gstin: str
    in_stock: bool = True
    raw_listing_text: str = ""  # untrusted marketing copy, may contain injections
    source: str = "unknown"
    is_msme: bool = False  # self-declared Udyam registration claim (verified against nothing live — see gstin.py)


class GstinCheck(BaseModel):
    gstin: str
    structurally_valid: bool
    checksum_valid: bool
    state_code_valid: bool
    is_msme_udyam: bool
    verdict: bool  # overall pass/fail
    detail: str


class SanitizationResult(BaseModel):
    original_text: str
    cleaned_text: str
    injection_detected: bool
    stripped_fragments: list[str] = []


class FirewallResult(BaseModel):
    vendor_id: str
    passed: bool
    reasons_failed: list[str] = []


class ScoredVendor(BaseModel):
    vendor: Vendor
    price_score: float
    reliability_score: float
    delivery_score: float
    return_score: float
    total_score: float
    rank: int = 0


class NegotiationResult(BaseModel):
    vendor_id: str
    original_unit_price_inr: float
    negotiated_unit_price_inr: float
    bulk_tier_applied: bool
    savings_total_inr: float


class ReplanEvent(BaseModel):
    brief_id: str
    trigger: str
    previous_vendor_id: Optional[str]
    new_vendor_id: Optional[str]
    succeeded: bool
    note: str


class EscalationCard(BaseModel):
    id: str
    brief_id: str
    reason: str
    context: str
    options: list[str] = ["Approve override", "Reject", "Request new brief"]
    resolved: bool = False
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None


class AuditEntry(BaseModel):
    transaction_id: str
    buying_brief_id: str
    status: str
    quantity: int
    max_unit_budget_inr: float
    max_delivery_days: int
    evaluated_vendors_count: int
    excluded_vendors: list[dict] = []
    selected_vendor: Optional[str] = None
    unit_price: Optional[float] = None
    delivery_days: Optional[int] = None
    selection_reasoning: str = ""
    counterfactual_analysis: str = ""
    authorisation_status: AuthorisationStatus
    security_events: list[str] = []
    negotiation: Optional[NegotiationResult] = None
    replan_events: list[ReplanEvent] = []
    requested_by: str = ""
    cost_center: str = ""
    governance_flag: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    audit_hash: str = ""


class BudgetPool(BaseModel):
    total_inr: float
    allocated_inr: float = 0
    saved_inr: float = 0
    briefs: dict[str, float] = {}  # brief_id -> spent

    @property
    def remaining_inr(self) -> float:
        return self.total_inr - self.allocated_inr + self.saved_inr
