"""
FastAPI orchestration layer (Slide 14 — "Orchestration layer connecting
intake, discovery and execution stages"). Thin by design: every endpoint
just calls into the Code Layer modules and returns their result. No
business logic lives here.

Role-based access: the person's role travels as an X-ProcureX-Role
header, checked by require_role() below. There is no login/session —
this demonstrates the authorization *boundary* a production deployment
would sit behind real auth (e.g. SSO + a proper session store), without
the live-demo risk of a password/session system breaking on stage.
"""
from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()  # picks up OPENROUTER_API_KEY / OPENROUTER_MODEL from backend/.env if present

from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import audit, planner, vendor_data
from .llm import llm_available, parse_brief_nl
from .schemas import BRIEF_CATEGORIES, BuyingBrief, CostCenter, FinanceManagerRecord, Role, role_at_least

app = FastAPI(title="ProcureX API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local hackathon demo — tighten for real deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_role(minimum: Role):
    def _dep(x_procurex_role: str = Header(default="REQUESTER")) -> Role:
        try:
            role = Role(x_procurex_role.upper())
        except ValueError:
            role = Role.REQUESTER
        if not role_at_least(role, minimum):
            raise HTTPException(
                403,
                f"This action requires {minimum.value} access (you're viewing as {role.value}).",
            )
        return role

    return _dep


@app.get("/api/health")
def health():
    return {"status": "ok", "llm_available": llm_available()}


@app.get("/api/briefs")
def list_briefs():
    return [b.model_dump() for b in vendor_data.BRIEFS]


@app.get("/api/briefs/{brief_id}/vendors")
def brief_vendors(brief_id: str):
    if not vendor_data.brief_by_id(brief_id):
        raise HTTPException(404, "Unknown brief id")
    return [v.model_dump() for v in vendor_data.vendors_for_brief(brief_id)]


@app.post("/api/run")
def run_pipeline():
    """Runs the full end-to-end flow across every current brief, including
    shared-budget reallocation, and returns everything the dashboard needs."""
    return planner.run_full_pipeline()


@app.get("/api/audit")
def get_audit_log():
    return [e.model_dump() for e in audit.all_entries()]


@app.get("/api/escalations")
def get_escalations():
    return [e.model_dump() for e in planner.ESCALATIONS.values()]


class ResolveEscalationRequest(BaseModel):
    resolution: str  # "Approve override" | "Reject" | "Request new brief"


@app.post("/api/escalations/{escalation_id}/resolve")
def resolve_escalation(
    escalation_id: str,
    body: ResolveEscalationRequest,
    role: Role = Depends(require_role(Role.FINANCE_MANAGER)),
):
    """Only Finance Managers (or Admins) may resolve an escalation — this
    is enforced here, server-side, not just hidden in the UI."""
    card = planner.resolve_escalation(escalation_id, body.resolution)
    if not card:
        raise HTTPException(404, "Unknown escalation id")
    return card.model_dump()


class SimulateOutageRequest(BaseModel):
    vendor_id: str


@app.post("/api/simulate/vendor-outage")
def simulate_vendor_outage(body: SimulateOutageRequest):
    """Marks a vendor out of stock and re-runs the pipeline, so the
    dashboard can demo the Dynamic Re-Planning flow (Slide 10) live."""
    planner.mark_vendor_unavailable(body.vendor_id)
    return planner.run_full_pipeline()


@app.post("/api/simulate/reset")
def simulate_reset():
    planner.reset_outages()
    planner.reset_resolutions()
    vendor_data.reset_injected_briefs()
    return planner.run_full_pipeline()


class SimulateDuplicateRequest(BaseModel):
    source_brief_id: str = "BRIEF-1-AI-ARENA"


@app.post("/api/simulate/duplicate-brief")
def simulate_duplicate_brief(body: SimulateDuplicateRequest):
    """Clones an existing brief (same title/qty/price/spec) into a new one
    and re-runs the pipeline, so the dashboard can demo duplicate-purchase
    detection live: the clone gets flagged and escalated instead of
    silently auto-approved and double-spending the pool."""
    vendor_data.inject_duplicate_brief(body.source_brief_id)
    return planner.run_full_pipeline()


@app.post("/api/simulate/personal-purchase")
def simulate_personal_purchase():
    """Injects a brief tied to an unapproved cost center and re-runs the
    pipeline, so the dashboard can demo the Business Justification Gate
    live: it's held for a Finance Manager instead of silently
    auto-approved, however clean the vendor match looks."""
    vendor_data.inject_personal_purchase_brief()
    return planner.run_full_pipeline()


@app.post("/api/simulate/category-mismatch")
def simulate_category_mismatch():
    """Injects a brief tied to a VALID, approved cost center but whose
    category doesn't belong under it (e.g. a gaming laptop charged to the
    Marketing & Swag budget) and re-runs the pipeline, so the dashboard
    can demo the category half of the Business Justification Gate live:
    an approved cost-center code alone isn't enough — it's held for a
    Finance Manager instead of silently auto-approved."""
    vendor_data.inject_category_mismatch_brief()
    return planner.run_full_pipeline()


class SimulateMalformedVendorRequest(BaseModel):
    brief_id: str = "BRIEF-1-AI-ARENA"


@app.post("/api/simulate/malformed-vendor")
def simulate_malformed_vendor(body: SimulateMalformedVendorRequest):
    """Injects a vendor listing with no listing text and no named source
    into an existing brief and re-runs the pipeline, so the dashboard can
    demo the data-quality gate live: it's excluded with a distinct
    DATA_QUALITY reason instead of silently passing through as compliant."""
    vendor_data.inject_malformed_vendor(body.brief_id)
    return planner.run_full_pipeline()


class ParseBriefRequest(BaseModel):
    text: str
    requested_by: str = "Unknown requester"
    cost_center: str = "UNSPECIFIED"


@app.post("/api/parse-brief")
def parse_brief(body: ParseBriefRequest):
    """LLM Layer entry point: turns free-text into a *draft* constraints
    dict. Still validated by BuyingBrief before it could ever be trusted
    downstream — the LLM proposes, Pydantic + the firewall decide."""
    draft = parse_brief_nl(body.text, brief_id="BRIEF-DRAFT")
    draft["requested_by"] = body.requested_by
    draft["cost_center"] = body.cost_center
    try:
        validated = BuyingBrief(**draft)
    except Exception as exc:
        raise HTTPException(422, f"LLM draft failed validation: {exc}")
    return validated.model_dump()


class SubmitBriefRequest(BaseModel):
    text: str
    # Required, not defaulted: a purchase with no attributable requester
    # or no declared category is exactly the "unidentified purchase" this
    # app exists to prevent — better to ask for both up front than to
    # paper over a missing one with a fake "Demo user" identity that
    # can't actually be traced back to anyone.
    requested_by: str
    category: str
    # Optional — the shared budget line still defaults sensibly to the
    # first approved cost center, since that's not an accountability gap
    # the way a missing name or category would be.
    cost_center: Optional[str] = None
    # Advanced/optional: forces an unapproved cost center regardless of
    # cost_center above, so the personal-purchase-prevention gate (Slide
    # 9's Business Justification Gate) can be demoed on demand without
    # making every submission jump through it.
    force_unapproved_cost_center: bool = False


@app.post("/api/submit-brief")
def submit_brief(body: SubmitBriefRequest):
    """The whole "Try a Brief" flow in one call: the LLM Layer parses free
    text into a draft (parse_brief_nl), Pydantic validates it as a real
    BuyingBrief (BuyingBrief(**draft) — the LLM proposes, code decides),
    it's injected into the live scenario the same way the other live-demo
    endpoints inject briefs, and the full pipeline re-runs so the caller
    gets back a real firewall/scoring/authorisation outcome — not a JSON
    dead end.

    requested_by and category are required here (not defaulted) so every
    submitted brief is traceable to a real person and a real declared
    category, even one that never gets past the firewall."""
    if not body.requested_by or not body.requested_by.strip():
        raise HTTPException(422, "A requester name is required so every purchase can be traced back to a person.")
    if body.category not in BRIEF_CATEGORIES:
        raise HTTPException(422, f"category must be one of {list(BRIEF_CATEGORIES)}.")

    draft = parse_brief_nl(body.text, brief_id="BRIEF-DRAFT")
    draft["requested_by"] = body.requested_by.strip()
    draft["category"] = body.category

    if body.force_unapproved_cost_center:
        draft["cost_center"] = "PERSONAL-UNLISTED"
    elif body.cost_center:
        draft["cost_center"] = body.cost_center
    else:
        default_cc = next((c.code for c in vendor_data.COST_CENTERS if c.active), "UNSPECIFIED")
        draft["cost_center"] = default_cc

    try:
        validated = BuyingBrief(**draft)
    except Exception as exc:
        raise HTTPException(422, f"LLM draft failed validation: {exc}")

    injected = vendor_data.inject_user_submitted_brief(validated)
    pipeline = planner.run_full_pipeline()
    return {"brief_id": injected.id, "pipeline": pipeline}


# ---------------------------------------------------------------------
# Admin — cost centers & finance manager roster (Admin role only)
# ---------------------------------------------------------------------

@app.get("/api/admin/cost-centers")
def list_cost_centers():
    return [c.model_dump() for c in vendor_data.COST_CENTERS]


class AddCostCenterRequest(BaseModel):
    code: str
    label: str


@app.post("/api/admin/cost-centers")
def add_cost_center(body: AddCostCenterRequest, role: Role = Depends(require_role(Role.ADMIN))):
    if vendor_data.cost_center_by_code(body.code):
        raise HTTPException(409, "That cost center code already exists.")
    cc = CostCenter(code=body.code, label=body.label)
    vendor_data.COST_CENTERS.append(cc)
    return cc.model_dump()


@app.post("/api/admin/cost-centers/{code}/deactivate")
def deactivate_cost_center(code: str, role: Role = Depends(require_role(Role.ADMIN))):
    cc = vendor_data.cost_center_by_code(code)
    if not cc:
        raise HTTPException(404, "Unknown cost center code")
    cc.active = False
    return cc.model_dump()


@app.get("/api/admin/finance-managers")
def list_finance_managers():
    return [f.model_dump() for f in vendor_data.FINANCE_MANAGERS]


class AddFinanceManagerRequest(BaseModel):
    name: str
    email: str


@app.post("/api/admin/finance-managers")
def add_finance_manager(body: AddFinanceManagerRequest, role: Role = Depends(require_role(Role.ADMIN))):
    fm = FinanceManagerRecord(
        id=f"FM-{len(vendor_data.FINANCE_MANAGERS) + 1}", name=body.name, email=body.email
    )
    vendor_data.FINANCE_MANAGERS.append(fm)
    return fm.model_dump()


@app.post("/api/admin/finance-managers/{fm_id}/remove")
def remove_finance_manager(fm_id: str, role: Role = Depends(require_role(Role.ADMIN))):
    before = len(vendor_data.FINANCE_MANAGERS)
    vendor_data.FINANCE_MANAGERS[:] = [f for f in vendor_data.FINANCE_MANAGERS if f.id != fm_id]
    if len(vendor_data.FINANCE_MANAGERS) == before:
        raise HTTPException(404, "Unknown finance manager id")
    return {"removed": fm_id}
