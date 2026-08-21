import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 shadow-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

/** Specific, actionable API failure state — never a bare "Something went
 * wrong": always says what failed and offers the one useful next step. */
export function ApiErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/25 bg-danger-soft p-6 flex flex-col gap-3 items-start"
    >
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span className="font-medium text-sm">Couldn't reach the ProcureX API</span>
      </div>
      <p className="text-xs font-mono text-danger/80 break-all">{message}</p>
      <p className="text-sm text-ink-soft">
        Make sure the backend is running (
        <code className="font-mono text-ink bg-surface-muted px-1 py-0.5 rounded">uvicorn app.main:app</code>{" "}
        from <code className="font-mono text-ink bg-surface-muted px-1 py-0.5 rounded">backend/</code>), then
        retry.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center flex flex-col items-center gap-3">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {action}
    </div>
  );
}
