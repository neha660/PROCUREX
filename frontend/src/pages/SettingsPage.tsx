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
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-text-dim">Workspace</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-hi font-medium">{MOCK_SETTINGS.workspace.name}</p>
              <p className="text-sm text-text-dim">{MOCK_SETTINGS.workspace.description}</p>
            </div>
            <Badge variant="outline" className="border-gold/40 text-gold-hi">
              {inr(pipeline?.pool.total_inr ?? MOCK_SETTINGS.workspace.sharedPoolInr)} pool
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-text-dim">
            Approval limits by role
          </h3>
          {MOCK_SETTINGS.approvalLimits.map((r, i) => (
            <div key={r.role}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-hi font-medium">{r.role}</p>
                  <p className="text-xs text-text-dim">{r.note}</p>
                </div>
                <span className="text-sm font-mono text-text-hi">{inr(r.autoApproveUpToInr)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-text-dim">
            Notifications
          </h3>
          {MOCK_SETTINGS.notificationPrefs.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <label htmlFor={p.id} className="text-sm text-text-hi">
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
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-text-dim">
            Integrations
          </h3>
          {MOCK_SETTINGS.integrations.map((integration, i) => (
            <div key={integration.id}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-hi">{integration.name}</span>
                <span className="text-xs font-mono text-text-dim">{integration.status}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
