import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState, CardGridSkeleton, EmptyState } from "@/components/shared/PageStates";
import { EscalationDrawer } from "@/components/approvals/EscalationDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import type { EscalationCardData } from "@/lib/types";
import { UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export function ApprovalsPage() {
  const { pipeline, loading, error, reload, resolveEscalation } = usePipelineContext();
  const [active, setActive] = useState<EscalationCardData | null>(null);

  const escalations = pipeline?.escalations ?? [];
  const open = escalations.filter((e) => !e.resolved);
  const resolved = escalations.filter((e) => e.resolved);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Approvals"
        description="Only genuine exceptions land here — a vendor that clears every constraint never does. Every card is a controlled decision, not an error."
      />

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && loading && !pipeline && <CardGridSkeleton />}

      {!error && pipeline && escalations.length === 0 && (
        <EmptyState
          icon={<UserCheck className="h-8 w-8" />}
          title="No open escalations"
          description={`All ${pipeline.briefs.length} briefs cleared authorisation automatically this run. Try "Simulate vendor unavailable" on a brief to see how ProcureX escalates when no compliant fallback exists.`}
        />
      )}

      {open.length > 0 && (
        <section aria-labelledby="open-esc-h">
          <h2 id="open-esc-h" className="text-[11px] font-semibold uppercase tracking-wide text-danger mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Awaiting your decision ({open.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {open.map((e) => (
              <EscalationSummaryCard key={e.id} card={e} onOpen={() => setActive(e)} />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section aria-labelledby="resolved-esc-h">
          <h2 id="resolved-esc-h" className="text-[11px] font-semibold uppercase tracking-wide text-success mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved ({resolved.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {resolved.map((e) => (
              <EscalationSummaryCard key={e.id} card={e} onOpen={() => setActive(e)} />
            ))}
          </div>
        </section>
      )}

      <EscalationDrawer
        card={active}
        pipeline={pipeline ?? null}
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        onResolve={async (id, resolution) => {
          await resolveEscalation(id, resolution);
          setActive(null);
        }}
      />
    </div>
  );
}

function EscalationSummaryCard({ card, onOpen }: { card: EscalationCardData; onOpen: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className={`cursor-pointer ${card.resolved ? "border-success/20" : "border-danger/20"}`}
    >
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{card.brief_id}</span>
          {card.resolved ? (
            <Badge className="bg-success-soft text-success border-success/20" variant="outline">
              Resolved
            </Badge>
          ) : (
            <Badge className="bg-danger-soft text-danger border-danger/20" variant="outline">
              Open
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium text-foreground">{card.reason}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{card.context}</p>
        {card.resolved && (
          <p className="text-xs text-success mt-1">Resolution: {card.resolution}</p>
        )}
      </CardContent>
    </Card>
  );
}
