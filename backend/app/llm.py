"""
LLM Layer — Proposes (Slide 5, left column).

Everything in this file is advisory text. It:
  - parses a natural-language brief into a draft constraints dict
    (still validated by the BuyingBrief Pydantic model before use)
  - writes human-readable ranking reasoning
  - drafts the counterfactual "what-if" narrative for the audit receipt

It NEVER sets AUTHORISED / ESCALATE / REJECT — that is exclusively
firewall.py + planner.py (the Code Layer).

Uses the Gemini SDK (google-genai) exclusively, matching the project's
"Gemini-only, no LangChain" stack choice. If GEMINI_API_KEY is not set,
every function falls back to a deterministic, rule-based stand-in so the
whole app still runs end-to-end with zero external dependency — useful
for demos, offline dev, or CI.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

from .schemas import BuyingBrief, ScoredVendor

_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

_client = None
if _API_KEY:
    try:
        from google import genai

        _client = genai.Client(api_key=_API_KEY)
    except Exception:
        _client = None  # fall back to mock mode rather than crash the app


def llm_available() -> bool:
    return _client is not None


def _call_gemini(prompt: str, *, json_mode: bool = False) -> Optional[str]:
    if not _client:
        return None
    try:
        config = {"response_mime_type": "application/json"} if json_mode else {}
        response = _client.models.generate_content(
            model=_MODEL, contents=prompt, config=config
        )
        return (response.text or "").strip()
    except Exception as exc:  # network/quota/model errors — degrade gracefully
        print(f"[llm] Gemini call failed, falling back to mock: {exc}")
        return None


# --------------------------------------------------------------------------
# 1. Natural-language brief -> draft constraints JSON
# --------------------------------------------------------------------------

_NUM_RE = r"\d[\d,]*(?:\.\d+)?"


def parse_brief_nl(text: str, brief_id: str = "BRIEF-DRAFT") -> dict:
    """Draft-only: the caller MUST still pass this through BuyingBrief(**data)
    so Pydantic validates types/ranges before anything downstream trusts it."""
    prompt = f"""Extract a structured procurement brief from this request.
Return ONLY minified JSON with keys: title (string), quantity (int),
min_ram_gb (int or null), min_ssd_gb (int or null),
max_unit_price_inr (number), max_delivery_days (int),
requires_warranty (bool), bulk_tier_qty (int or null),
bulk_tier_price_inr (number or null).

Request: \"\"\"{text}\"\"\""""

    raw = _call_gemini(prompt, json_mode=True)
    if raw:
        try:
            data = json.loads(raw)
            data["id"] = brief_id
            data["raw_text"] = text
            return data
        except json.JSONDecodeError:
            pass

    return _mock_parse_brief(text, brief_id)


def _mock_parse_brief(text: str, brief_id: str) -> dict:
    """Deterministic regex-based fallback — no API key required."""
    lower = text.lower()

    def find_num(pattern: str) -> Optional[float]:
        m = re.search(pattern, lower)
        if not m:
            return None
        digits = m.group(1).replace(",", "")
        try:
            return float(digits) if digits else None
        except ValueError:
            return None

    # Quantity: a leading count word ("20 wireless mice", "10 laptops", "500 hoodies")
    qty = find_num(rf"\b({_NUM_RE})\s+(?:x\s*)?[a-z]")

    # Price: any of "₹500", "rs 500", "500 rs", "inr 500", optionally "/unit" or "per unit"
    price = (
        find_num(rf"(?:₹|rs\.?|inr)\s*({_NUM_RE})")
        or find_num(rf"({_NUM_RE})\s*(?:₹|rs\.?|inr)\b")
    )
    ram = find_num(rf"({_NUM_RE})\s*gb\s*ram")
    ssd = find_num(rf"({_NUM_RE})\s*gb\s*ssd")
    delivery = find_num(rf"({_NUM_RE})\s*[- ]?day")
    warranty = "warranty" in lower

    return {
        "id": brief_id,
        "title": text.strip()[:60] or "Untitled brief",
        "quantity": int(qty) if qty else 1,
        "min_ram_gb": int(ram) if ram else None,
        "min_ssd_gb": int(ssd) if ssd else None,
        "max_unit_price_inr": price if price else 1000.0,
        "max_delivery_days": int(delivery) if delivery else 7,
        "requires_warranty": warranty,
        "bulk_tier_qty": None,
        "bulk_tier_price_inr": None,
        "raw_text": text,
    }


# --------------------------------------------------------------------------
# 2. Vendor ranking reasoning (advisory text only)
# --------------------------------------------------------------------------

def generate_selection_reasoning(brief: BuyingBrief, ranked: list[ScoredVendor]) -> str:
    if not ranked:
        return "No vendor passed the hard-constraint firewall; no selection made."

    winner = ranked[0]
    prompt = f"""In 1-2 sentences, explain why "{winner.vendor.name}" is the best
procurement choice for "{brief.title}". It scored {winner.total_score}/100
(price {winner.price_score}, reliability {winner.reliability_score},
delivery {winner.delivery_score}, returns {winner.return_score}). Be concise
and factual, finance-audience tone. Do not mention you are an AI."""

    text = _call_gemini(prompt)
    if text:
        return text

    return (
        f"Passed all hard constraints; top score {winner.total_score}/100, "
        f"driven by unit price (₹{winner.vendor.unit_price_inr:,.0f}), "
        f"{'a 1-year' if winner.vendor.has_warranty else 'no'} warranty, and "
        f"{winner.vendor.rating}★ reliability rating."
    )


# --------------------------------------------------------------------------
# 3. Counterfactual "what-if" narrative for the audit receipt
# --------------------------------------------------------------------------

def generate_counterfactual(
    brief: BuyingBrief, all_scored: list[ScoredVendor], winner: Optional[ScoredVendor]
) -> str:
    if not winner or len(all_scored) < 2:
        return "No alternate vendor would have changed the outcome at this budget cap."

    runner_up = next((s for s in all_scored if s.vendor.id != winner.vendor.id), None)
    if not runner_up:
        return "No alternate vendor available for counterfactual comparison."

    price_gap = runner_up.vendor.unit_price_inr - brief.max_unit_price_inr
    prompt = f"""In one sentence, write a finance-facing counterfactual note:
if the budget cap for "{brief.title}" had been ₹{max(price_gap,0)+brief.max_unit_price_inr:,.0f}
instead of ₹{brief.max_unit_price_inr:,.0f}, vendor "{runner_up.vendor.name}"
(score {runner_up.total_score}/100) would have ranked #1 instead of "{winner.vendor.name}".
Mention one concrete spec/delivery advantage. Be concise."""

    text = _call_gemini(prompt)
    if text:
        return text

    if price_gap > 0:
        return (
            f"At a cap of ₹{price_gap + brief.max_unit_price_inr:,.0f} "
            f"(+₹{price_gap:,.0f}), {runner_up.vendor.name} would rank #1 on "
            f"delivery ({runner_up.vendor.delivery_days} days) and reliability "
            f"({runner_up.vendor.rating}★)."
        )
    return (
        f"{runner_up.vendor.name} (score {runner_up.total_score}/100) was the "
        f"closest alternative but did not overtake {winner.vendor.name} even "
        f"without a budget change."
    )
