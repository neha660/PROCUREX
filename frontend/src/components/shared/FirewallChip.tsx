import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FirewallChip as FirewallChipData } from "@/lib/firewallChips";

const STYLES: Record<FirewallChipData["status"], { cls: string; Icon: typeof Check }> = {
  Passed: { cls: "bg-success-soft text-success border-success/20", Icon: Check },
  Failed: { cls: "bg-danger-soft text-danger border-danger/20", Icon: X },
  "Needs review": { cls: "bg-warning-soft text-warning border-warning/20", Icon: AlertTriangle },
};

/** A single deterministic-check result. Never relies on colour alone —
 * every chip pairs an icon with the literal status word, and the tooltip
 * carries the precise reason (not just red/green). */
export function FirewallChipBadge({ chip }: { chip: FirewallChipData }) {
  const { cls, Icon } = STYLES[chip.status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
            cls
          )}
        >
          <Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          {chip.label}
          <span className="opacity-70">· {chip.status}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{chip.detail}</TooltipContent>
    </Tooltip>
  );
}
