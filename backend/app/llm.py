"""
LLM Layer — Proposes (Slide 5, left column).

Everything in this file is advisory text. It:
  - parses a natural-language brief into a draft constraints dict
    (still validated by the BuyingBrief Pydantic model before use)
  - writes human-readable ranking reasoning
  - drafts the counterfactual "what-if" narrative for the audit receipt

It NEVER sets AUTHORISED / ESCALATE / REJECT — that is exclusively
firewall.py + planner.py (the Code Layer).

Calls OpenRouter's OpenAI-compatible chat completions endpoint
(https://openrouter.ai/api/v1/chat/completions), which fronts hundreds of
models — Gemini, Claude, GPT, Llama, etc. — behind one API key, so swapping
models is a one-line env var change rather than a new SDK. If
OPENROUTER_API_KEY is not set, every function falls back to a
deterministic, rule-based stand-in so the whole app still runs end-to-end
with zero external dependency — useful for demos, offline dev, or CI.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

import httpx

from .schemas import BuyingBrief, ScoredVendor

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# "~google/gemini-flash-latest" is OpenRouter's self-updating alias — the
# leading "~" tells it to always resolve to whatever the current Gemini
# Flash model is, so a mid-hackathon Google release doesn't leave this
# pointing at a retired version. Any concrete slug works here too, e.g.
# "anthropic/claude-sonnet-5", "openai/gpt-5", "meta-llama/llama-3.3-70b-instruct".
# Full catalog + alias list: openrouter.ai/models
_MODEL = os.getenv("OPENROUTER_MODEL", "~google/gemini-flash-latest")
_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()


def llm_available() -> bool:
    return bool(_API_KEY)


def _call_openrouter(prompt: str, *, json_mode: bool = False) -> Optional[str]:
    if not _API_KEY:
        return None
    try:
        body: dict = {
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            # OpenRouter's "basic JSON mode" — guarantees valid JSON, same
            # idea as Gemini's response_mime_type="application/json".
            body["response_format"] = {"type": "json_object"}

        response = httpx.post(
            _OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json",
                # Optional app-identification headers OpenRouter uses for its
                # public leaderboards — harmless to send, safe to ignore.
                "HTTP-Referer": "https://github.com/procurex",
                "X-Title": "ProcureX",
            },
            json=body,
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        return (data["choices"][0]["message"]["content"] or "").strip()
    except Exception as exc:  # network/quota/model errors — degrade gracefully
        print(f"[llm] OpenRouter call failed, falling back to mock: {exc}")
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

    raw = _call_openrouter(prompt, json_mode=True)
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

    text = _call_openrouter(prompt)
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

    text = _call_openrouter(prompt)
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
