import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle, Metric } from "@/components/shared/Primitives";
import { ApiErrorState, CardGridSkeleton } from "@/components/shared/PageStates";
import { BriefCard } from "@/components/brief/BriefCard";
import { BudgetAllocationBar } from "@/components/budget/BudgetAllocationBar";
import { BudgetIntelligencePanel } from "@/components/budget/BudgetIntelligencePanel";
import { SpendByBriefChart } from "@/components/budget/SpendByBriefChart";
import { ConstraintFirewallSection } from "@/components/shared/ConstraintFirewallSection";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import { compactInr, inr } from "@/lib/api";
import { daysUntilIgnite26 } from "@/lib/mock";
import { ArrowRight, FilePlus2 } from "lucide-react";

export function OverviewPage() {
  const { pipeline, loading, error, reload, openCreateBrief } = usePipelineContext();
  const navigate = useNavigate();

  const briefs = pipeline?.briefs ?? [];
  const escalatedCount = briefs.filter((b) => b.audit_entry.authorisation_status === "ESCALATED").length;
  const committedInr = briefs.reduce(
    (sum, b) => sum + (b.audit_entry.unit_price ? b.audit_entry.unit_price * b.audit_entry.quantity : 0),
    0
  );

  return (
    <div className="flex flex-col gap-12">
      {/* ---- Hero -------------------------------------------------- */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-ink-900 to-ink-950 p-6 md:p-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-hi bg-gold/10 border border-gold/30 rounded-full px-3 py-1">
            {daysUntilIgnite26()} days until Ignite '26
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-text-hi max-w-2xl leading-tight">
          Procurement, under control.
        </h1>
        <p className="text-text-mid max-w-xl">
          Autonomous where it can be. Accountable where it must be. ProcureX reads every buying
          brief against one shared pool, negotiates, and escalates only genuine exceptions.
        </p>
        <div className="flex flex-wrap gap-3 mt-1">
          <Button onClick={() => navigate("/briefs")} className="bg-gold text-ink-950 hover:bg-gold-hi gap-1.5">
            Review procurement plan
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateBrief} variant="outline" className="border-line gap-1.5">
            <FilePlus2 className="h-4 w-4" />
            Create buying brief
          </Button>
        </div>
      </section>

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && loading && !pipeline && <CardGridSkeleton count={6} />}

      {!error && pipeline && (
        <>
          {/* ---- KPIs ------------------------------------------------ */}
          <section aria-label="Key procurement metrics">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card><CardContent><Metric label="Shared budget" value={compactInr(pipeline.pool.total_inr)} /></CardContent></Card>
              <Card><CardContent><Metric label="Committed spend" value={inr(committedInr)} /></CardContent></Card>
              <Card><CardContent><Metric label="Remaining pool" value={inr(pipeline.pool.remaining_inr)} accent="text-gold-hi" /></CardContent></Card>
              <Card><CardContent><Metric label="Savings recovered" value={inr(pipeline.pool.net_surplus_returned_inr)} accent="text-sage-hi" /></CardContent></Card>
              <Card><CardContent><Metric label="Active briefs" value={briefs.length} /></CardContent></Card>
              <Card>
                <CardContent>
                  <Metric
                    label="Human escalations"
                    value={escalatedCount}
                    accent={escalatedCount === 0 ? "text-sage-hi" : "text-coral-hi"}
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ---- Shared budget centrepiece --------------------------- */}
          <section aria-labelledby="pool-h">
            <SectionTitle
              eyebrow="The shared pool"
              title={<span id="pool-h">₹65,00,000 — one pool, three briefs</span>}
              sub="Every brief draws from the same budget instead of an isolated per-brief approval, so a savings win in one line can cover an overage in another."
            />
            <Card className="mb-4">
              <CardContent>
                <BudgetAllocationBar pipeline={pipeline} />
              </CardContent>
            </Card>
            <div className="grid lg:grid-cols-2 gap-4">
              <BudgetIntelligencePanel pipeline={pipeline} />
              <Card>
                <CardContent>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-dim mb-3">
                    Spend by brief
                  </h3>
                  <SpendByBriefChart pipeline={pipeline} />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ---- Command center preview ------------------------------ */}
          <section aria-labelledby="cc-preview-h">
            <SectionTitle
              eyebrow="Procurement command center"
              title={<span id="cc-preview-h">Three briefs, evaluated together</span>}
              sub="Read the full pipeline — discovery, firewall, scoring, negotiation, authorisation — for each brief."
            />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              {briefs.slice(0, 3).map((b) => (
                <BriefCard key={b.brief.id} summary={b} onOpenDetail={() => navigate("/briefs")} />
              ))}
            </div>
            <Button variant="outline" className="border-line gap-1.5" onClick={() => navigate("/briefs")}>
              View all buying briefs
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </section>

          <ConstraintFirewallSection pipeline={pipeline} />
        </>
      )}
    </div>
  );
}
