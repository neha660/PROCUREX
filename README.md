# ProcureX

**Autonomous where it can be. Accountable where it must be.**

An implementation of the AXIOM3 pitch deck for Rockathon '26: an AI agent
that discovers, evaluates, negotiates, and purchases against three
procurement briefs sharing one ₹65,00,000 budget — escalating only what
truly needs a human.

This is a full working app, not a mockup. Every number on the dashboard is
computed live by the backend's constraint firewall, scoring model, and
budget allocator — nothing is hardcoded in the frontend.

## What's implemented

Mapped straight to the deck's sections:

| Deck section | Where it lives |
|---|---|
| Buying Brief Intake (NL → constraints) | `backend/app/llm.py` — `parse_brief_nl` |
| Sanitizer Firewall (prompt-injection defense) | `backend/app/sanitizer.py` |
| Vendor Trust Layer (GSTIN checksum + MSME) | `backend/app/gstin.py` |
| Hard-Constraint Filter (Stage 1) | `backend/app/firewall.py` |
| Soft-Constraint Scorer / WSM (Stage 2) | `backend/app/scorer.py` |
| Simulated RFQ / bulk-tier negotiation | `backend/app/negotiator.py` |
| Shared Budget Allocator + reallocation | `backend/app/budget.py` |
| Dynamic re-planning (vendor outage → fallback) | `backend/app/planner.py` |
| HITL escalation cards | `backend/app/planner.py` + `frontend/src/components/EscalationCard.jsx` |
| Structured audit log + counterfactual receipts | `backend/app/audit.py` |
| Orchestration | `backend/app/main.py` (FastAPI) |
| Finance & Ops Dashboard | `frontend/` (React + Vite + TypeScript + Tailwind + shadcn/ui) |

The three buying briefs (laptops, LED screens, hoodies) and their vendor
listings are seeded exactly as described in the deck, including the
deliberately hostile "QuickLED Traders" listing used to demo the
prompt-injection defense and GSTIN checksum rejection.

**No API key is required to run or demo this.** The LLM layer (`llm.py`)
has a deterministic offline fallback for every call, so the whole
pipeline — firewall, scoring, negotiation, reallocation, audit trail — runs
end to end with zero external dependency. Add an `OPENROUTER_API_KEY` later
if you want live natural-language reasoning instead of the mock text — it
calls [OpenRouter](https://openrouter.ai)'s OpenAI-compatible endpoint, so
one key gets you Gemini, Claude, GPT, Llama, and hundreds of other models;
swap which one by changing `OPENROUTER_MODEL`.

## Prerequisites

- **Python 3.12+** (developed against 3.13)
- **Node.js 20+** and npm (developed against Node 24 / npm 12)
- Git Bash (comes with [Git for Windows](https://git-scm.com/download/win))
- VS Code

## Setup — VS Code + Git Bash

Open the `procurex` folder in VS Code, then open a **Git Bash terminal**
inside VS Code (Terminal → New Terminal → select "Git Bash" from the
dropdown if it isn't already the default).

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Git Bash on Windows
pip install -r requirements.txt
cp .env.example .env               # optional — only needed for live LLM calls
```

If you want live LLM reasoning instead of the offline mock, open `.env`
and set `OPENROUTER_API_KEY=your-key-here`. `OPENROUTER_MODEL` defaults to
`~google/gemini-flash-latest` — the leading `~` is OpenRouter's
self-updating alias syntax, so it always resolves to the current Gemini
Flash model instead of pinning a dated version that can get retired
mid-hackathon. Any concrete model slug works too — see
[openrouter.ai/models](https://openrouter.ai/models).

Run the API:

```bash
uvicorn app.main:app --port 8000
```

Leave this running. Check it's alive at http://127.0.0.1:8000/api/health —
you should see `{"status":"ok","llm_available":false}` (or `true` if you
set an OpenRouter key).

> **Skip `--reload` if this folder lives under OneDrive** (as `procurex`
> does by default). OneDrive's background sync touches files in ways that
> can trigger spurious `watchfiles` reloads mid-request, silently resetting
> in-memory state (escalations, outage simulations, custom briefs). Without
> `--reload`, just re-run the command above after editing backend code.

### 2. Frontend

Open a **second** Git Bash terminal (Terminal → Split Terminal):

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The dashboard
calls the backend at `http://127.0.0.1:8000` by default — override with
`VITE_API_BASE` in `frontend/.env` if you're running the backend elsewhere.

## Using the dashboard

A multi-page shell (sidebar + top bar, collapses to a mobile drawer below
`lg`) built with React Router, TypeScript, Tailwind v4, and shadcn/ui:

- **Overview** — hero + KPI row, the shared-₹65L allocation bar, the
  budget-intelligence reallocation flow, a spend-by-brief chart, and the
  "LLM proposes / code decides" constraint-firewall explainer with live
  pass/fail chips for this run.
- **Buying briefs** — the procurement command center: filterable brief
  cards, each opening a detail drawer with the pipeline stepper, the
  vendor firewall gate, the Stage 2 weighted-sum table, and the **live
  demo controls** to knock a vendor out of stock and watch the dynamic
  re-planner either auto-select a fallback or raise an honest escalation.
- **Vendor discovery** — every candidate vendor across every brief in one
  filterable, sortable comparison table (card list on mobile), with an
  expandable detail panel: why it passed/failed, GSTIN trust breakdown,
  weighted score, negotiation history, and counterfactuals.
- **Approvals** — open/resolved escalation cards; each opens a drawer with
  the failed constraints, the current best compliant alternative (cost +
  delivery delta), and exactly three actions — Approve exception, Choose
  fallback, Request re-plan.
- **Audit trail** — every brief's structured receipt styled as a ledger
  ticket, with the counterfactual "what-if" analysis, a tamper-evident
  `audit_hash`, and Copy ID / Export JSON / Export CSV / Compare vendors
  actions.
- **Security events** — a reconstructed timeline of every GSTIN rejection
  and prompt-injection attempt this run, each with its automated action,
  authorisation impact, and audit reference — proving untrusted vendor
  text can never override a business rule.
- **Settings** — workspace, approval limits, and notification preferences.
  Everything here except the live pool total is presentation-only mock
  data (`frontend/src/lib/mock.ts`) — the backend has no settings API yet.
- **New procurement brief** (top bar, or `⌘K`) — a 4-step wizard: describe
  in plain language → review the extracted constraints (LLM/mock-parsed,
  hard constraints marked) → confirm shared-budget behaviour → start
  discovery, which really does call the backend and run the new brief
  through the full pipeline alongside the seed briefs.

## Project layout

```
procurex/
├── backend/
│   ├── app/
│   │   ├── schemas.py       # Pydantic models — the trust boundary
│   │   ├── gstin.py         # GSTIN checksum validation
│   │   ├── sanitizer.py     # prompt-injection stripping
│   │   ├── vendor_data.py   # seeded briefs + vendor listings
│   │   ├── firewall.py      # Stage 1 hard filter + trust gate
│   │   ├── scorer.py        # Stage 2 weighted-sum model
│   │   ├── negotiator.py    # bulk-tier RFQ simulation
│   │   ├── budget.py        # shared-pool allocator
│   │   ├── llm.py           # OpenRouter layer + offline fallback
│   │   ├── planner.py       # orchestration state machine
│   │   ├── audit.py         # structured audit log
│   │   └── main.py          # FastAPI app
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── components.json        # shadcn/ui config
    ├── src/
    │   ├── App.tsx             # React Router route table
    │   ├── main.tsx
    │   ├── index.css           # design tokens (Tailwind v4 CSS-first config)
    │   ├── lib/
    │   │   ├── api.ts          # backend client
    │   │   ├── types.ts        # TS mirrors of the Pydantic schemas
    │   │   ├── firewallChips.ts, budget.ts, vendorRows.ts,
    │   │   │   securityEvents.ts, escalationContext.ts  # derive UI-ready
    │   │   │   views from the same /api/run response — no extra endpoints
    │   │   └── mock.ts         # isolated mock data (event date, Settings)
    │   ├── hooks/
    │   │   └── usePipeline.ts  # single source of truth: one /api/run call
    │   │       feeds every page via router outlet context
    │   ├── pages/               # one file per sidebar destination
    │   └── components/
    │       ├── ui/              # shadcn/ui primitives
    │       ├── layout/          # AppShell, sidebar, top bar, command menu
    │       ├── shared/, brief/, vendor/, budget/, security/, audit/,
    │       │   approvals/       # feature components
    └── .env.example
```

## Extending it

- **New buying brief (seed data)**: add a `BuyingBrief` + matching `Vendor`
  entries in `backend/app/vendor_data.py`. Everything downstream (firewall,
  scoring, negotiation, audit) picks it up automatically — nothing else to
  wire. For a brief created at runtime instead, the frontend's "New
  procurement brief" wizard calls `POST /api/briefs`
  (`vendor_data.add_custom_brief`), which appends the brief plus three
  synthetic candidate vendors and re-runs the pipeline — additive only, it
  never touches the seeded briefs.
- **New hard constraint**: add a field to `BuyingBrief` in `schemas.py`
  and a check in `firewall.py`. This mirrors the deck's own stated
  limitation ("extending the Pydantic schema" — Slide 12).
- **Real GSTIN verification**: `gstin.py` currently does structural +
  checksum validation only (matches the deck's "Round 1" scope — Slide 12).
  Live government-registry lookup would replace `validate_gstin`'s
  internals without touching any caller.
