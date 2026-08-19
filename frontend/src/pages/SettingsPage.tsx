import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { inr } from "@/lib/api";
import { MOCK_SETTINGS } from "@/lib/mock";
import { usePipelineContext } from "@/hooks/usePipelineContext";

/**
 * NOTE: the backend has no settings/workspace API — everything here comes
 * from lib/mock.ts and local component state only. It's presentation-only
 * scaffolding for what a real settings surface would look like; the
 * shared budget total shown below is the one real number, read live from
 * the pipeline.
 */
export function SettingsPage() {
  const { pipeline } = usePipelineContext();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader title="Settings" description="Workspace, approval limits, and notification preferences for Ignite '26." />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Workspace</h3>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-foreground font-medium truncate">{MOCK_SETTINGS.workspace.name}</p>
              <p className="text-sm text-muted-foreground truncate">{MOCK_SETTINGS.workspace.description}</p>
            </div>
            <Badge variant="outline" className="border-money/25 text-money shrink-0 tabular-nums">
              {inr(pipeline?.pool.total_inr ?? MOCK_SETTINGS.workspace.sharedPoolInr)} pool
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Approval limits by role
          </h3>
          {MOCK_SETTINGS.approvalLimits.map((r, i) => (
            <div key={r.role}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{r.role}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.note}</p>
                </div>
                <span className="text-sm font-mono text-foreground tabular-nums shrink-0">{inr(r.autoApproveUpToInr)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notifications
          </h3>
          {MOCK_SETTINGS.notificationPrefs.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={p.id} className="text-sm text-foreground">
                  {p.label}
                </label>
                <Switch id={p.id} defaultChecked={p.enabled} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Integrations
          </h3>
          {MOCK_SETTINGS.integrations.map((integration, i) => (
            <div key={integration.id}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{integration.name}</span>
                <span className="text-xs font-mono text-muted-foreground text-right">{integration.status}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
