# ProcureX

**Autonomous where it can be. Accountable where it must be.**

An AI agent that discovers, evaluates, negotiates, and purchases against
company buying briefs — inside strict business rules — escalating only
what truly needs a human.

This is the Round 2 rebuild: a new landing page that explains the
architecture in one screen, role-based access (Requester / Finance
Manager / Admin), a business-justification gate to stop personal
purchases, and duplicate-purchase detection — on top of the original
constraint-firewall / scoring / shared-budget-reallocation engine.

## What's new in this rebuild

| Ask | Where it lives |
|---|---|
| "Cluttered, doesn't explain itself" | New **Home** page — hero, the LLM/Code split rendered as a literal two-column diagram, live KPIs, and an in-app "how authorisation works" breakdown |
| "Doesn't stand out" | A system-wide dual-signal color language: **amber** tags everything LLM-authored ("proposes"), **indigo** tags every deterministic code decision ("decides") — visible on every reasoning field, not just explained in a paragraph |
| "How do we stop personal purchases?" | **Business Justification Gate** (`governance.py`) — every brief needs a requester + an approved cost center; unapproved ones always escalate, never silently auto-approve |
| "How do we stop two people buying the same thing?" | **Duplicate-purchase detection** (`planner.py`) — flags briefs matching an already-authorised one in the same run (this fulfils something the original deck already promised on Slide 11) |
| "Do we need a Finance Manager / Admin portal?" | **Role switcher**, enforced server-side via an `X-ProcureX-Role` header — not real login (a password/session system is a common live-demo failure point), but a real authorization boundary a production deployment would sit behind actual auth |
| "How does authorisation work?" | Laid out in plain language on the **Home** page, and demonstrated live via the "Live demo" buttons on the **Briefs** tab |
| MSME/Udyam flag (Slide 7) was schema-only, never wired to real data | Every seed vendor now carries a real `is_msme` claim; shown as a badge on any vendor with a *valid* GSTIN — smaller/local vendors flagged True, established ones False |
| Malformed vendor data (Slide 11) had no actual detection path | New data-quality gate in `firewall.py`: a listing with no description and no named source is excluded outright with a distinct reason, not silently passed. Demoable via a dedicated "Live demo" button |
| "Closest miss per constraint" (Slide 11) wasn't implemented | New `_closest_miss_analysis()` in `planner.py` — when no vendor clears every hard constraint, it identifies the single vendor that missed by the fewest reasons and states exactly which constraint to relax and by how much (e.g. "delivery SLA relaxed from 7 to 9 days") |

## No API key required to run or demo this

The LLM layer (`llm.py`) uses OpenRouter with a full offline fallback —
every function still works with zero external calls if `OPENROUTER_API_KEY`
is unset. Add one later for live LLM reasoning instead of the
deterministic mock text.

## Setup — VS Code + Git Bash

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Git Bash on Windows
pip install -r requirements.txt
cp .env.example .env               # optional — only needed for live LLM calls
uvicorn app.main:app --reload --port 8000
```

Check it's alive: http://127.0.0.1:8000/api/health

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Using the dashboard

- **Home** — start here. One screen explaining what ProcureX is, the
  core "LLM proposes / code decides" split, and how authorisation works.
- **Dashboard** — live brief status, shared-pool reallocation log.
- **Briefs** — pick a brief for its pipeline stepper, firewall gate,
  scoring table, and **three live demo buttons**:
  - Knock a vendor out of stock → watch dynamic re-planning
  - Submit a duplicate of the current brief → watch it get held for review
  - Submit a brief on an unapproved cost center → watch the business
    justification gate catch it before any vendor is even searched
- **Audit Trail** — structured JSON receipts, dual-tagged (amber =
  LLM-written reasoning, indigo = code-decided status).
- **Escalations** — HITL cards. Resolvable only as Finance Manager or
  Admin; visible read-only as Requester.
- **Admin** *(Admin role only)* — manage approved cost centers and the
  Finance Manager roster.
- **Try a Brief** — submit a natural-language brief with a requester
  name and cost center; watch the LLM draft it and Pydantic validate it.

Switch roles from the **"Viewing as"** control in the top bar — the nav,
the escalation actions, and the Admin tab all respond to it, and the
backend enforces the boundary independently of what the UI shows.

## Project layout

```
procurex/
├── backend/app/
│   ├── schemas.py       # Pydantic models — the trust boundary, now incl. Role
│   ├── governance.py    # Business Justification Gate (misuse prevention)
│   ├── gstin.py          # GSTIN checksum validation
│   ├── sanitizer.py      # prompt-injection stripping
│   ├── vendor_data.py    # seeded briefs, vendors, cost centers, finance managers
│   ├── firewall.py       # Stage 1 hard filter + trust gate
│   ├── scorer.py          # Stage 2 weighted-sum model
│   ├── negotiator.py      # bulk-tier RFQ simulation
│   ├── budget.py           # shared-pool allocator
│   ├── llm.py               # OpenRouter layer + offline fallback
│   ├── planner.py           # orchestration + duplicate detection + governance wiring
│   ├── audit.py              # structured audit log
│   └── main.py                # FastAPI app + role-gated endpoints
└── frontend/src/
    ├── App.jsx            # Home, Dashboard, Briefs, Audit, Escalations, Admin, Try a Brief
    ├── api.js              # backend client incl. role header
    ├── index.css            # design tokens — light theme, dual brand/ai color system
    └── components/
```

## Known limitations, stated honestly

- **Role-based access is not authentication.** There's no login,
  password, or session — the role travels as a plain header, which is
  fine for a live demo but would need real auth (SSO, sessions) before
  any real deployment.
- **The Business Justification Gate never rejects outright** — an
  unapproved cost center always escalates rather than auto-rejecting,
  because a brand-new legitimate project and someone gaming the system
  look identical to code; only a person can tell them apart.
- **Duplicate detection is exact-match on brief fields** (title,
  quantity, price cap, delivery window) within a single pipeline run —
  it won't catch a duplicate phrased differently, and it doesn't persist
  detection across separate runs.
