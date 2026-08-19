"""
FastAPI orchestration layer (Slide 14 — "Orchestration layer connecting
intake, discovery and execution stages"). Thin by design: every endpoint
just calls into the Code Layer modules and returns their result. No
business logic lives here.
"""
from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()  # picks up OPENROUTER_API_KEY / OPENROUTER_MODEL from backend/.env if present

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import audit, planner, vendor_data
from .llm import llm_available, parse_brief_nl
from .schemas import BuyingBrief

app = FastAPI(title="ProcureX API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local hackathon demo — tighten for real deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "llm_available": llm_available()}


@app.get("/api/briefs")
def list_briefs():
    return [b.model_dump() for b in vendor_data.BRIEFS]


class CreateBriefRequest(BaseModel):
    """Body for the buying-brief creation wizard's final step. Mirrors
    BuyingBrief's own fields — Pydantic validates it here, same as every
    other entry point into the pipeline."""

    title: str
    quantity: int
    min_ram_gb: Optional[int] = None
    min_ssd_gb: Optional[int] = None
    max_unit_price_inr: float
    max_delivery_days: int
    requires_warranty: bool = False
    bulk_tier_qty: Optional[int] = None
    bulk_tier_price_inr: Optional[float] = None
    raw_text: Optional[str] = None


@app.post("/api/briefs")
def create_brief(body: CreateBriefRequest):
    """Additive: appends a new buying brief + a small synthetic vendor RFQ
    to the in-memory session, then re-runs the full pipeline so the new
    brief is discovered, firewalled, scored, and (re)joins the shared pool
    alongside the Ignite '26 seed briefs — exactly like a real new brief
    landing mid-event."""
    vendor_data.add_custom_brief(body.model_dump())
    return planner.run_full_pipeline()


@app.get("/api/briefs/{brief_id}/vendors")
def brief_vendors(brief_id: str):
    if not vendor_data.brief_by_id(brief_id):
        raise HTTPException(404, "Unknown brief id")
    return [v.model_dump() for v in vendor_data.vendors_for_brief(brief_id)]


@app.post("/api/run")
def run_pipeline():
    """Runs the full end-to-end flow across all three briefs, including
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
def resolve_escalation(escalation_id: str, body: ResolveEscalationRequest):
    card = planner.ESCALATIONS.get(escalation_id)
    if not card:
        raise HTTPException(404, "Unknown escalation id")
    from datetime import datetime

    card.resolved = True
    card.resolution = body.resolution
    card.resolved_at = datetime.utcnow()
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
    return planner.run_full_pipeline()


class ParseBriefRequest(BaseModel):
    text: str


@app.post("/api/parse-brief")
def parse_brief(body: ParseBriefRequest):
    """LLM Layer entry point: turns free-text into a *draft* constraints
    dict. Still validated by BuyingBrief before it could ever be trusted
    downstream — the LLM proposes, Pydantic + the firewall decide."""
    draft = parse_brief_nl(body.text, brief_id="BRIEF-DRAFT")
    try:
        validated = BuyingBrief(**draft)
    except Exception as exc:
        raise HTTPException(422, f"LLM draft failed validation: {exc}")
    return validated.model_dump()
