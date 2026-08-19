import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState, CardGridSkeleton, EmptyState } from "@/components/shared/PageStates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import { buildSecurityEvents } from "@/lib/securityEvents";
import { ShieldAlert, ShieldCheck, FileSearch } from "lucide-react";

export function SecurityPage() {
  const { pipeline, loading, error, reload } = usePipelineContext();
  const navigate = useNavigate();
  const events = useMemo(() => buildSecurityEvents(pipeline), [pipeline]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security events"
        description="Vendor listing text is untrusted input. It's sanitized, checked, and logged — but it can never override a business rule, no matter what it claims."
      />

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && (
        <>
          <Card className="border-sage/30 bg-sage/[0.04]">
            <CardContent className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-sage-hi shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-text-mid">
                <strong className="text-sage-hi">Zero authorisation impact this run:</strong> every
                event below was caught and neutralised by deterministic code before it could reach
                a purchase decision. The LLM layer only ever reads sanitized text.
              </p>
            </CardContent>
          </Card>

          {loading && !pipeline && <CardGridSkeleton />}

          {!loading && pipeline && events.length === 0 && (
            <EmptyState
              icon={<ShieldAlert className="h-8 w-8" />}
              title="No security events this run"
              description="No invalid GSTINs or prompt-injection attempts were detected across any brief's vendor pool."
            />
          )}

          <ol className="flex flex-col gap-3" aria-label="Security event timeline">
            {events.map((ev) => (
              <li key={ev.id}>
                <Card className={ev.severity === "High" ? "border-coral/30" : "border-gold/30"}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            ev.severity === "High"
                              ? "border-coral/40 text-coral-hi bg-coral/10"
                              : "border-gold/40 text-gold-hi bg-gold/10"
                          }
                        >
                          {ev.severity} severity
                        </Badge>
                        <span className="text-sm font-medium text-text-hi">{ev.type}</span>
                      </div>
                      <time className="text-xs font-mono text-text-dim" dateTime={ev.timestamp}>
                        {new Date(ev.timestamp).toLocaleString("en-IN")}
                      </time>
                    </div>
                    <p className="text-sm text-text-mid">
                      <span className="text-text-hi font-medium">{ev.vendorName}</span> ·{" "}
                      {ev.briefTitle.split(" — ").pop()}
                    </p>
                    <p className="text-sm text-text-mid">{ev.reason}</p>
                    <div className="grid sm:grid-cols-2 gap-2 mt-1 text-xs">
                      <div className="rounded-md bg-ink-900 border border-line p-2">
                        <span className="text-text-dim block mb-0.5">Automated action</span>
                        <span className="text-text-hi">{ev.action}</span>
                      </div>
                      <div className="rounded-md bg-ink-900 border border-line p-2">
                        <span className="text-text-dim block mb-0.5">Authorisation impact</span>
                        <span className="text-sage-hi">{ev.authorisationImpact}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-1.5 text-text-mid -ml-2 w-fit mt-1"
                      onClick={() => navigate(`/audit#${ev.auditRef}`)}
                    >
                      <FileSearch className="h-3.5 w-3.5" />
                      Audit reference — {ev.auditRef}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
