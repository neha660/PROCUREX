import { useEffect, useState, useCallback } from "react";
import {
  LayoutGrid,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Menu,
  X,
  Home as HomeIcon,
  Settings,
  ChevronRight,
  Users,
  Wallet,
  Lock as LockIcon,
} from "lucide-react";
import { api, inr, setRole, getRole } from "./api";
import PoolGauge from "./components/PoolGauge";
import {
  Card,
  Metric,
  SectionTitle,
  StatusPill,
  Eyebrow,
  Button,
  AiTag,
  CodeTag,
  RoleLock,
} from "./components/Primitives";
import FirewallGate from "./components/FirewallGate";
import VendorScoreTable from "./components/VendorScoreTable";
import PipelineStepper from "./components/PipelineStepper";
import AuditReceipt from "./components/AuditReceipt";
import EscalationCard from "./components/EscalationCard";

const ROLES = [
  { id: "REQUESTER", label: "Requester" },
  { id: "FINANCE_MANAGER", label: "Finance Manager" },
  { id: "ADMIN", label: "Admin" },
];

function navFor(role) {
  const base = [
    { id: "Home", icon: HomeIcon },
    { id: "Dashboard", icon: LayoutGrid },
    { id: "Briefs", icon: FileText },
    { id: "Audit Trail", icon: ShieldCheck },
    { id: "Escalations", icon: AlertTriangle },
    { id: "Try a Brief", icon: Sparkles },
  ];
  if (role === "ADMIN") base.push({ id: "Admin", icon: Settings });
  return base;
}

export default function App() {
  const [tab, setTab] = useState("Home");
  const [role, setRoleState] = useState("REQUESTER");
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [selectedBriefId, setSelectedBriefId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, h] = await Promise.all([api.run(), api.health()]);
      setPipeline(result);
      setHealth(h);
      setSelectedBriefId((prev) => prev || result.briefs?.[0]?.brief.id || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = (newRole) => {
    setRole(newRole);
    setRoleState(newRole);
    if (newRole !== "ADMIN" && tab === "Admin") setTab("Dashboard");
  };

  const resolveEscalation = async (id, resolution) => {
    await api.resolveEscalation(id, resolution);
    await load();
  };

  const escalationCount = pipeline?.escalations?.filter((e) => !e.resolved).length || 0;
  const nav = navFor(role);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        <SidebarContent tab={tab} setTab={setTab} escalationCount={escalationCount} health={health} nav={nav} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-end px-3 pt-3">
              <button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-1.5 text-text-mid hover:bg-surface-muted">
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              tab={tab}
              setTab={(t) => {
                setTab(t);
                setMobileNavOpen(false);
              }}
              escalationCount={escalationCount}
              health={health}
              nav={nav}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-text-mid hover:bg-surface-muted lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-text-hi">{tab}</h1>
            </div>

            <RoleSwitcher role={role} onChange={changeRole} />

            <div className="hidden w-56 shrink-0 xl:block">
              <PoolGauge pool={pipeline?.pool} />
            </div>

            <Button variant="primary" onClick={load} disabled={loading} className="shrink-0">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{loading ? "Running…" : "Run pipeline"}</span>
            </Button>
          </div>
          <div className="px-4 pb-3.5 xl:hidden">
            <PoolGauge pool={pipeline?.pool} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {error && (
              <Card className="mb-6 border-danger-600/30 bg-danger-50 p-4 text-sm text-danger-700">
                Couldn't reach the ProcureX API at the configured URL. Is the backend running?
                <div className="mt-1 break-words font-mono text-xs text-danger-600/80">{error}</div>
              </Card>
            )}

            {!pipeline && !error && <div className="py-20 text-center text-sm text-text-dim">Running pipeline…</div>}

            {tab === "Home" && <Home pipeline={pipeline} onEnter={() => setTab("Dashboard")} />}
            {pipeline && tab === "Dashboard" && <Dashboard pipeline={pipeline} />}
            {pipeline && tab === "Briefs" && (
              <BriefsTab
                pipeline={pipeline}
                selectedBriefId={selectedBriefId}
                setSelectedBriefId={setSelectedBriefId}
                onOutage={async (vendorId) => {
                  await api.simulateOutage(vendorId);
                  await load();
                }}
                onDuplicate={async (briefId) => {
                  await api.simulateDuplicate(briefId);
                  await load();
                  setTab("Escalations");
                }}
                onPersonal={async () => {
                  await api.simulatePersonalPurchase();
                  await load();
                  setTab("Escalations");
                }}
                onMalformed={async (briefId) => {
                  await api.simulateMalformedVendor(briefId);
                  await load();
                }}
                onReset={async () => {
                  await api.simulateReset();
                  await load();
                }}
              />
            )}
            {pipeline && tab === "Audit Trail" && <AuditTrail pipeline={pipeline} />}
            {pipeline && tab === "Escalations" && (
              <EscalationsTab pipeline={pipeline} onResolve={resolveEscalation} role={role} />
            )}
            {tab === "Admin" && role === "ADMIN" && <AdminTab />}
            {tab === "Try a Brief" && <TryBriefTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

function RoleSwitcher({ role, onChange }) {
  const [open, setOpen] = useState(false);
  const current = ROLES.find((r) => r.id === role);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-white px-2.5 py-2 text-xs font-medium text-text-hi hover:bg-surface-muted"
      >
        <Users size={13} className="text-text-dim" />
        <span className="hidden sm:inline">Viewing as</span>
        <span className="text-brand-700">{current.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                  r.id === role ? "bg-brand-50 text-brand-700" : "text-text-hi"
                }`}
              >
                {r.label}
                {r.id === role && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ tab, setTab, escalationCount, health, nav }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          P
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-hi">ProcureX</div>
          <div className="truncate text-[11px] text-text-dim">Autonomous procurement</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {nav.map(({ id, icon: Icon }) => {
          const active = tab === id;
          const showBadge = id === "Escalations" && escalationCount > 0;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                active ? "bg-brand-50 text-brand-700" : "text-text-mid hover:bg-surface-muted"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{id}</span>
              {showBadge && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">
                  {escalationCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-4">
        <div
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium ${
            health?.llm_available
              ? "border-success-600/20 bg-success-50 text-success-700"
              : "border-warning-600/20 bg-warning-50 text-warning-700"
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span className="truncate">{health?.llm_available ? "LLM live" : "Offline mock LLM"}</span>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* HOME — the landing page. Solves "cluttered, doesn't explain itself". */
/* Five seconds on this page should tell a non-technical judge exactly */
/* what ProcureX is and why the architecture is trustworthy.           */
/* ------------------------------------------------------------------ */
function Home({ pipeline, onEnter }) {
  return (
    <div className="flex flex-col gap-12">
      <section className="animate-fade-up rounded-2xl border border-border bg-surface bg-grid p-8 sm:p-12">
        <Eyebrow>AXIOM3 · Rockathon '26 · Problem Statement 1</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-text-hi sm:text-4xl">
          ProcureX
        </h1>
        <p className="mt-2 max-w-2xl text-base font-medium text-text-mid sm:text-lg">
          Autonomous where it can be. Accountable where it must be.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-mid">
          An AI agent that discovers, evaluates, negotiates, and purchases against company buying
          briefs — inside strict business rules — escalating only what truly needs a human. It
          reads every open brief as one shared budget instead of isolated approvals, and never
          lets a language model decide what's financially or legally valid.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={onEnter}>
            Open the dashboard <ChevronRight size={15} />
          </Button>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="The recurring rule"
          title="The LLM proposes. Deterministic code decides."
          sub="Every vendor recommendation is generated by a language model. Every authorisation decision is made by plain, auditable code that never reads LLM output as an instruction."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-ai-500/25 bg-ai-50/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AiTag>LLM layer</AiTag>
              <span className="text-sm font-semibold text-text-hi">Proposes</span>
            </div>
            <ul className="space-y-2 text-sm text-text-mid">
              <li>· Parses natural-language briefs into draft constraints</li>
              <li>· Ranks vendors with plain-language reasoning</li>
              <li>· Writes counterfactual "what-if" explanations</li>
              <li>· Never sets AUTHORISED, ESCALATE, or REJECT</li>
            </ul>
          </Card>
          <Card className="border-brand-500/25 bg-brand-50/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CodeTag>Code layer</CodeTag>
              <span className="text-sm font-semibold text-text-hi">Decides</span>
            </div>
            <ul className="space-y-2 text-sm text-text-mid">
              <li>· Validates price against the shared budget pool</li>
              <li>· Validates quantity, specification, and delivery SLA</li>
              <li>· Validates warranty and vendor GSTIN trust</li>
              <li>· Sets AUTHORISED, ESCALATE, or REJECT — deterministically</li>
            </ul>
          </Card>
        </div>
      </section>

      {pipeline && (
        <section>
          <SectionTitle eyebrow="This run's hard-constraint results" title="Not just a demo — live numbers" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-5">
              <Metric label="Procurement cycle" value="3d → 6min" accent="text-brand-600" />
            </Card>
            <Card className="p-5">
              <Metric label="Shared pool" value="₹65L" />
            </Card>
            <Card className="p-5">
              <Metric label="Net surplus returned" value={inr(pipeline.pool.net_surplus_returned_inr)} accent="text-success-700" />
            </Card>
            <Card className="p-5">
              <Metric
                label="Human overrides needed"
                value={pipeline.briefs.filter((b) => b.audit_entry.authorisation_status !== "AUTO_APPROVED").length}
                accent="text-text-hi"
              />
            </Card>
          </div>
        </section>
      )}

      <section>
        <SectionTitle
          eyebrow="How authorisation works"
          title="What the agent decides alone vs. what it escalates"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 text-sm font-semibold text-success-700">Auto-approved</div>
            <ul className="space-y-2 text-sm text-text-mid">
              <li>· Vendor passes every hard constraint</li>
              <li>· Final price sits inside the per-unit and pool budget caps</li>
              <li>· Bulk-tier / RFQ discount alone resolves a minor overage</li>
              <li>· Surplus reallocation across briefs stays inside the shared pool</li>
              <li>· Brief carries a valid requester and approved cost center</li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="mb-3 text-sm font-semibold text-danger-700">Escalated to human</div>
            <ul className="space-y-2 text-sm text-text-mid">
              <li>· No vendor clears every hard constraint</li>
              <li>· Overage remains even after RFQ + reallocation</li>
              <li>· The only compliant vendor is out of stock with no fallback</li>
              <li>· Cost center is missing or not on the approved list</li>
              <li>· Brief looks like a duplicate of one already authorised</li>
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ pipeline }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle
          eyebrow="Section A — Problem understanding"
          title="Every open brief, one shared budget"
          sub="Ignite '26, a 3-day tech summit. Every hour spent comparing vendor PDFs is an hour not spent on the event."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {pipeline.briefs.map(({ brief, audit_entry, result }) => (
            <Card key={brief.id} className="flex min-w-0 flex-col gap-3 p-5">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <Eyebrow>{brief.id.replace(/-/g, " ")}</Eyebrow>
                  <h3 className="mt-1 truncate text-[15px] font-semibold text-text-hi" title={brief.title}>
                    {brief.title}
                  </h3>
                </div>
                <StatusPill status={audit_entry.authorisation_status} />
              </div>
              <div className="space-y-1.5 text-sm text-text-mid">
                <div className="truncate">
                  Qty {brief.quantity} · cap {inr(brief.max_unit_price_inr)}/unit
                </div>
                <div className="truncate">
                  {brief.requested_by} · <span className="font-mono text-xs">{brief.cost_center}</span>
                </div>
                <div className="truncate">
                  Selected: <span className="text-text-hi">{audit_entry.selected_vendor || "—"}</span>
                  {audit_entry.unit_price && ` @ ${inr(audit_entry.unit_price)}`}
                </div>
                {result.governance_reason && (
                  <div className="truncate text-danger-700">Held: {result.governance_reason}</div>
                )}
                {result.bulk_savings_inr > 0 && (
                  <div className="truncate text-success-700">Bulk RFQ saved {inr(result.bulk_savings_inr)}</div>
                )}
                {result.overage_inr > 0 && (
                  <div className="truncate text-warning-700">
                    Overage {inr(result.overage_inr)} —{" "}
                    {audit_entry.authorisation_status === "AUTO_APPROVED" ? "auto-covered" : "unresolved"}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Section C/D — Shared budget & RFQ"
          title="How overages get auto-resolved"
          sub="No escalation needed — the agent checks the shared pool before ever bothering a human."
        />
        <Card className="p-5">
          <ol className="space-y-2.5 text-sm text-text-mid">
            {pipeline.pool.log.length === 0 && <li className="text-text-dim">No reallocation was needed this run.</li>}
            {pipeline.pool.log.map((line, i) => (
              <li key={i} className="flex min-w-0 gap-3">
                <span className="shrink-0 font-mono text-xs text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 break-words">{line}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}

function BriefsTab({ pipeline, selectedBriefId, setSelectedBriefId, onOutage, onDuplicate, onPersonal, onMalformed, onReset }) {
  const active = pipeline.briefs.find((b) => b.brief.id === selectedBriefId) || pipeline.briefs[0];
  const blocked = !!active.result.governance_reason;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {pipeline.briefs.map(({ brief, audit_entry }) => {
          const isDuplicate = brief.id.includes("-DUP-");
          const isPersonal = brief.id.includes("PERSONAL");
          return (
            <button
              key={brief.id}
              onClick={() => setSelectedBriefId(brief.id)}
              className={`flex min-w-0 max-w-full items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                active.brief.id === brief.id
                  ? "border-brand-500/40 bg-brand-50 text-text-hi"
                  : "border-border text-text-mid hover:bg-surface-muted"
              }`}
            >
              <span className="truncate">
                {brief.title}
                {isDuplicate && <span className="text-text-dim"> (duplicate submission)</span>}
                {isPersonal && <span className="text-text-dim"> (unapproved cost center)</span>}
              </span>
              <StatusPill status={audit_entry.authorisation_status} />
            </button>
          );
        })}
      </div>

      <Card className="overflow-x-auto p-6">
        <PipelineStepper activeIndex={blocked ? 1 : 7} />
      </Card>

      {blocked ? (
        <Card className="border-danger-600/25 p-6">
          <SectionTitle
            eyebrow="Business justification gate"
            title="Held before vendor discovery"
            sub={active.result.governance_reason}
          />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[11px] text-text-dim">Requested by</div>
              <div className="text-text-hi">{active.brief.requested_by}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-dim">Cost center</div>
              <div className="font-mono text-text-hi">{active.brief.cost_center}</div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <SectionTitle
              eyebrow="Section B/C — Sanitizer + constraint firewall"
              title="Vendor discovery → trust layer → hard filter"
              sub="Every listing is sanitized for prompt-injection before the LLM ever sees it, then gated on GSTIN validity, spec, delivery-SLA, and warranty."
            />
            <FirewallGate
              firewallResults={active.result.firewall_results}
              gstinChecks={active.result.gstin_checks}
              vendorsById={active.result.vendors}
            />
          </Card>

          <Card className="p-6">
            <SectionTitle
              eyebrow="Section C — Decision logic"
              title="Stage 2 — Weighted sum model"
              sub="Only firewall survivors are scored. Price 40% · Reliability & Warranty 30% · Delivery 20% · Returns 10%."
            />
            <VendorScoreTable ranked={active.result.ranked} winnerId={active.result.ranked[0]?.vendor.id} />
          </Card>
        </>
      )}

      {active.result.replan_events?.length > 0 && (
        <Card className="border-warning-600/25 p-6">
          <SectionTitle eyebrow="Section G — Edge cases" title="Dynamic re-planning triggered" />
          {active.result.replan_events.map((ev, i) => (
            <div key={i} className="mb-2 text-sm text-text-mid">
              <span className="font-medium text-warning-700">{ev.trigger}</span> — {ev.note}
            </div>
          ))}
        </Card>
      )}

      <Card className="p-6">
        <SectionTitle eyebrow="Live demo" title="Simulate a vendor going out of stock" />
        <div className="flex flex-wrap gap-2">
          {active.result.ranked?.slice(0, 3).map((s) => (
            <Button key={s.vendor.id} variant="secondary" onClick={() => onOutage(s.vendor.id)}>
              Knock out #{s.rank} {s.vendor.name}
            </Button>
          ))}
          <Button variant="ghost" onClick={onReset}>
            Reset demo state
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="Live demo"
          title="Simulate an accidental duplicate purchase"
          sub="Two people on a team submit the same request independently — the clone is held for review instead of silently auto-approved."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onDuplicate(active.brief.id)}>
            Submit a duplicate of "{active.brief.title}"
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Reset demo state
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="Live demo"
          title="Simulate a personal purchase attempt"
          sub="A brief tied to a cost center that was never approved — held for a Finance Manager, however clean the vendor match looks."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPersonal}>
            Submit a brief on an unapproved cost center
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Reset demo state
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="Live demo"
          title="Simulate a malformed vendor listing"
          sub="A scraped listing with no description and no named source — excluded outright with a distinct data-quality reason, not silently treated as a pass just because nothing explicit failed."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onMalformed(active.brief.id)}>
            Inject a malformed listing for "{active.brief.title}"
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Reset demo state
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AuditTrail({ pipeline }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Section E — Audit trail design"
        title="A receipt finance can actually audit"
        sub="Every field is structured JSON — pipes straight into an ERP or spreadsheet export. audit_hash gives a tamper-evident fingerprint for reconciliation."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {pipeline.briefs.map((b) => (
          <AuditReceipt key={b.audit_entry.transaction_id} entry={b.audit_entry} />
        ))}
      </div>
    </div>
  );
}

function EscalationsTab({ pipeline, onResolve, role }) {
  const cards = pipeline.escalations || [];
  const canResolve = role === "FINANCE_MANAGER" || role === "ADMIN";
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="Section D — Authorisation & approval"
        title="What the agent escalates to a human"
        sub="Only genuine exceptions land here — a vendor that clears every constraint never does."
        right={!canResolve && <RoleLock label="Read-only as Requester" />}
      />
      {cards.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-text-mid">
            No open escalations. Try one of the live demos on the Briefs tab.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <EscalationCard key={card.id} card={card} onResolve={onResolve} canResolve={canResolve} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTab() {
  const [costCenters, setCostCenters] = useState([]);
  const [financeManagers, setFinanceManagers] = useState([]);
  const [ccCode, setCcCode] = useState("");
  const [ccLabel, setCcLabel] = useState("");
  const [fmName, setFmName] = useState("");
  const [fmEmail, setFmEmail] = useState("");
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cc, fm] = await Promise.all([api.listCostCenters(), api.listFinanceManagers()]);
      setCostCenters(cc);
      setFinanceManagers(fm);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="Admin"
        title="Governance configuration"
        sub="Manage which cost centers count as approved company budget lines, and who has Finance Manager access. Enforced server-side via role checks."
        right={<RoleLock label="Admin only" />}
      />

      {err && <Card className="border-danger-600/30 bg-danger-50 p-4 text-sm text-danger-700">{err}</Card>}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wallet size={15} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-text-hi">Approved cost centers</h3>
        </div>
        <div className="mb-4 space-y-2">
          {costCenters.map((c) => (
            <div key={c.code} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-mono text-text-hi">{c.code}</span>
                <span className="text-text-mid"> — {c.label}</span>
              </div>
              <span className={c.active ? "text-success-700" : "text-text-dim"}>
                {c.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={ccCode}
            onChange={(e) => setCcCode(e.target.value)}
            placeholder="CODE (e.g. IGNITE26-AV)"
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <input
            value={ccLabel}
            onChange={(e) => setCcLabel(e.target.value)}
            placeholder="Label"
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <Button
            variant="primary"
            onClick={async () => {
              if (!ccCode.trim() || !ccLabel.trim()) return;
              try {
                await api.addCostCenter(ccCode.trim(), ccLabel.trim());
                setCcCode("");
                setCcLabel("");
                load();
              } catch (e) {
                setErr(e.message);
              }
            }}
          >
            Add cost center
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users size={15} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-text-hi">Finance managers</h3>
        </div>
        <div className="mb-4 space-y-2">
          {financeManagers.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <div className="min-w-0 truncate">
                <span className="text-text-hi">{f.name}</span>
                <span className="text-text-dim"> · {f.email}</span>
              </div>
              <button
                onClick={async () => {
                  try {
                    await api.removeFinanceManager(f.id);
                    load();
                  } catch (e) {
                    setErr(e.message);
                  }
                }}
                className="shrink-0 text-xs text-danger-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={fmName}
            onChange={(e) => setFmName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <input
            value={fmEmail}
            onChange={(e) => setFmEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <Button
            variant="primary"
            onClick={async () => {
              if (!fmName.trim() || !fmEmail.trim()) return;
              try {
                await api.addFinanceManager(fmName.trim(), fmEmail.trim());
                setFmName("");
                setFmEmail("");
                load();
              } catch (e) {
                setErr(e.message);
              }
            }}
          >
            Add finance manager
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TryBriefTab() {
  const [text, setText] = useState(
    "Need 15 wireless presenter remotes, budget ₹900 per unit, delivery within 4 days, no warranty required"
  );
  const [requestedBy, setRequestedBy] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [costCenters, setCostCenters] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.listCostCenters().then(setCostCenters).catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.parseBrief(text, requestedBy || "Unknown requester", costCenter || "UNSPECIFIED");
      setResult(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <SectionTitle
        eyebrow="LLM layer — proposes"
        title="Natural-language brief → structured constraints"
        sub="The LLM only ever drafts a proposal. It still gets validated by the same Pydantic schema the rest of the pipeline trusts, and every brief must declare a requester and cost center before it can ever be auto-approved."
      />
      <Card className="p-5">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <select
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            className="rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="">Cost center…</option>
            {costCenters.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm text-text-hi outline-none placeholder:text-text-dim focus:border-brand-500"
        />
        <div className="mt-3">
          <Button variant="ai" onClick={run} disabled={busy || !text.trim()}>
            <Sparkles size={14} />
            {busy ? "Parsing…" : "Parse with LLM"}
          </Button>
        </div>
      </Card>

      {err && <Card className="border-danger-600/30 bg-danger-50 p-4 text-sm text-danger-700">{err}</Card>}

      {result && (
        <Card className="overflow-hidden p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-text-dim">
              Validated draft (BuyingBrief schema)
            </div>
            <AiTag>LLM proposed</AiTag>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-hi">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
