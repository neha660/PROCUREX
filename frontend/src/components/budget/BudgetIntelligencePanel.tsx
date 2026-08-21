import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/Primitives";
import { inr } from "@/lib/api";
import { computeBudgetIntelligence } from "@/lib/budget";
import { cn } from "@/lib/utils";
import type { PipelineResult } from "@/lib/types";
import { TrendingUp, ArrowRight, PiggyBank, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * "Budget intelligence" — the reallocation story, told as a vertical
 * timeline rather than side-by-side boxes, so it stays readable however
 * narrow its column gets (this card shares a row with the spend chart on
 * desktop). Every number is pulled live from this run's pool + brief
 * results, not hardcoded to the Ignite '26 example.
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
      tone: "danger" as const,
    },
    {
      icon: PiggyBank,
      label: `${savingsNames} bulk-tier savings`,
      value: inr(intel.totalSavings),
      tone: "money" as const,
    },
    {
      icon: ArrowRight,
      label: "Reallocated to cover overage",
      value: inr(intel.drawn),
      tone: "money" as const,
    },
    {
      icon: intel.allResolved ? CheckCircle2 : AlertCircle,
      label: intel.allResolved ? "Purchase proceeds — no escalation" : "Gap remains — escalated",
      value: intel.netSurplusReturned > 0 ? `${inr(intel.netSurplusReturned)} surplus preserved` : "",
      tone: intel.allResolved ? ("success" as const) : ("danger" as const),
    },
  ];

  const iconCls = {
    danger: "bg-danger-soft border-danger/20 text-danger",
    money: "bg-money-soft border-money/20 text-money",
    success: "bg-success-soft border-success/20 text-success",
  };
  const valueCls = {
    danger: "text-danger",
    money: "text-money",
    success: "text-success",
  };

  return (
    <Card>
      <CardContent>
        <SectionTitle
          eyebrow="Budget intelligence"
          title="How the shared pool auto-resolved this run"
          sub={`${overageNames} exceeded its unit cap; ProcureX recovered savings via ${savingsNames}'s bulk tier, covered the gap, and preserved the remainder as surplus — before any human was asked.`}
        />
        <ol aria-label="Budget reallocation flow">
          {steps.map((step, i) => (
            <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <span className="absolute left-4 top-9 bottom-0 w-px bg-border" aria-hidden="true" />
              )}
              <div
                className={cn(
                  "relative z-10 h-8 w-8 rounded-full border flex items-center justify-center shrink-0 animate-gate-pass",
                  iconCls[step.tone]
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <step.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-1.5">
                <span className="text-sm font-medium text-foreground">{step.label}</span>
                {step.value && (
                  <span className={cn("font-display font-semibold text-sm tabular-nums shrink-0", valueCls[step.tone])}>
                    {step.value}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
