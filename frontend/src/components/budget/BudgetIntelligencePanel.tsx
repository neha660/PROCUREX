import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/Primitives";
import { inr } from "@/lib/api";
import { computeBudgetIntelligence } from "@/lib/budget";
import type { PipelineResult } from "@/lib/types";
import { TrendingUp, ArrowRight, PiggyBank, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * "Budget intelligence" — the reallocation story, told as a flow instead
 * of a wall of text. Every number is pulled live from this run's pool +
 * brief results, not hardcoded to the Ignite '26 example.
 */
export function BudgetIntelligencePanel({ pipeline }: { pipeline: PipelineResult | null }) {
  const intel = computeBudgetIntelligence(pipeline);

  if (!intel) {
    return (
      <Card>
        <CardContent>
          <SectionTitle
            eyebrow="Budget intelligence"
            title="No reallocation needed this run"
            sub="Every brief cleared its own price cap — the shared pool never had to move money between briefs."
          />
        </CardContent>
      </Card>
    );
  }

  const overageNames = intel.overageBriefs.map((b) => b.brief.title.split(" — ").pop()).join(", ");
  const savingsNames = intel.savingsBriefs.map((b) => b.brief.title.split(" — ").pop()).join(", ");

  const steps = [
    {
      icon: TrendingUp,
      label: `${overageNames} overage`,
      value: `+${inr(intel.totalOverage)}`,
      tone: "coral" as const,
    },
    {
      icon: PiggyBank,
      label: `${savingsNames} bulk-tier savings`,
      value: inr(intel.totalSavings),
      tone: "gold" as const,
    },
    {
      icon: ArrowRight,
      label: "Reallocated to cover overage",
      value: inr(intel.drawn),
      tone: "gold" as const,
    },
    {
      icon: intel.allResolved ? CheckCircle2 : AlertCircle,
      label: intel.allResolved ? "Purchase proceeds — no escalation" : "Gap remains — escalated",
      value: intel.netSurplusReturned > 0 ? `${inr(intel.netSurplusReturned)} surplus preserved` : "",
      tone: intel.allResolved ? ("sage" as const) : ("coral" as const),
    },
  ];

  const toneCls = {
    coral: "border-coral/30 bg-coral/[0.06] text-coral-hi",
    gold: "border-gold/30 bg-gold/[0.06] text-gold-hi",
    sage: "border-sage/30 bg-sage/[0.06] text-sage-hi",
  };

  return (
    <Card>
      <CardContent>
        <SectionTitle
          eyebrow="Budget intelligence"
          title="How the shared pool auto-resolved this run"
          sub={`${overageNames} exceeded its unit cap; ProcureX recovered savings via ${savingsNames}'s bulk tier, covered the gap, and preserved the remainder as surplus — before any human was asked.`}
        />
        <ol className="flex flex-col md:flex-row items-stretch md:items-center gap-2" aria-label="Budget reallocation flow">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`rounded-lg border p-3 flex flex-col gap-1 flex-1 min-w-0 animate-gate-pass ${toneCls[step.tone]}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <step.icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium leading-snug">{step.label}</span>
                {step.value && <span className="font-display font-semibold text-sm">{step.value}</span>}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight
                  className="h-4 w-4 text-text-dim shrink-0 hidden md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
