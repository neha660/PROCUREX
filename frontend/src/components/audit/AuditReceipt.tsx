import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusPill } from "@/components/shared/Primitives";
import { inr } from "@/lib/api";
import { exportAuditCsv, exportAuditJson } from "@/lib/exportAudit";
import type { AuditEntry } from "@/lib/types";
import { Copy, ExternalLink, FileJson, Table2, Hash } from "lucide-react";

export function AuditReceipt({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const copyId = async () => {
    await navigator.clipboard.writeText(entry.transaction_id);
    toast.success("Transaction ID copied", { description: entry.transaction_id });
  };

  return (
    <div id={entry.transaction_id} className="bg-ivory text-ink-950 rounded-lg overflow-hidden shadow-lg shadow-black/30 scroll-mt-24">
      <div className="receipt-edge bg-ink-950 h-2" aria-hidden="true" />
      <div className="p-5 font-mono text-[13px] leading-relaxed">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-950/50">
              ProcureX audit receipt
            </div>
            <div className="font-semibold text-[13px]">{entry.transaction_id}</div>
          </div>
          <StatusPill status={entry.authorisation_status} />
        </div>

        <div className="border-t border-dashed border-ink-950/25 my-3" />

        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px]">
          <span className="text-ink-950/55">brief_id</span>
          <span className="text-right truncate">{entry.buying_brief_id}</span>
          <span className="text-ink-950/55">quantity</span>
          <span className="text-right">{entry.quantity}</span>
          <span className="text-ink-950/55">max_unit_budget</span>
          <span className="text-right">{inr(entry.max_unit_budget_inr)}</span>
          <span className="text-ink-950/55">max_delivery_days</span>
          <span className="text-right">{entry.max_delivery_days}</span>
          <span className="text-ink-950/55">evaluated_vendors</span>
          <span className="text-right">{entry.evaluated_vendors_count}</span>
          <span className="text-ink-950/55">selected_vendor</span>
          <span className="text-right truncate">{entry.selected_vendor || "—"}</span>
          <span className="text-ink-950/55">unit_price</span>
          <span className="text-right">{inr(entry.unit_price)}</span>
          <span className="text-ink-950/55">delivery_days</span>
          <span className="text-right">{entry.delivery_days ?? "—"}</span>
        </div>

        <div className="border-t border-dashed border-ink-950/25 my-3" />

        <div className="text-[12px]">
          <div className="text-ink-950/55 mb-1">selection_reasoning</div>
          <p className="text-ink-950/85">{entry.selection_reasoning}</p>
        </div>

        {open && (
          <>
            <div className="mt-3 text-[12px]">
              <div className="text-ink-950/55 mb-1">counterfactual_analysis</div>
              <p className="text-ink-950/85">{entry.counterfactual_analysis}</p>
            </div>

            {entry.negotiation?.bulk_tier_applied && (
              <div className="mt-3 text-[12px]">
                <div className="text-ink-950/55 mb-1">negotiation</div>
                <p className="text-ink-950/85">
                  {inr(entry.negotiation.original_unit_price_inr)} →{" "}
                  {inr(entry.negotiation.negotiated_unit_price_inr)} · saved{" "}
                  {inr(entry.negotiation.savings_total_inr)} total
                </p>
              </div>
            )}

            {entry.replan_events?.length > 0 && (
              <div className="mt-3 text-[12px]">
                <div className="text-ink-950/55 mb-1">replan_events</div>
                {entry.replan_events.map((ev, i) => (
                  <p key={i} className="text-ink-950/85">
                    {ev.trigger} → {ev.note}
                  </p>
                ))}
              </div>
            )}

            {entry.security_events?.length > 0 && (
              <div className="mt-3 text-[12px]">
                <div className="text-red-700/70 mb-1">security_events</div>
                {entry.security_events.map((ev, i) => (
                  <p key={i} className="text-red-800">
                    {ev}
                  </p>
                ))}
              </div>
            )}

            {entry.excluded_vendors?.length > 0 && (
              <div className="mt-3 text-[12px]">
                <div className="text-ink-950/55 mb-1">excluded_vendors</div>
                {entry.excluded_vendors.map((v, i) => (
                  <p key={i} className="text-ink-950/85">
                    {v.vendor_id} — {v.reasons_failed.join(", ")}
                  </p>
                ))}
              </div>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-3 text-[12px] flex items-center gap-1.5 text-ink-950/55 cursor-help w-fit">
                  <Hash className="h-3 w-3" />
                  audit_hash: <span className="text-ink-950/85">{entry.audit_hash}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                SHA-256 over every field except this one, truncated to 16 hex chars — a
                tamper-evident fingerprint for reconciliation. Recomputing it from the exported
                JSON should always match.
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-3 text-[11px] uppercase tracking-wide text-ink-950/50 hover:text-ink-950/80 transition-colors"
        >
          {open ? "− Collapse full receipt" : "+ Expand full receipt"}
        </button>

        <div className="border-t border-dashed border-ink-950/25 my-3" />

        <div className="flex flex-wrap gap-2 -mx-1">
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-ink-950/70 hover:text-ink-950 hover:bg-ink-950/10" onClick={copyId}>
            <Copy className="h-3 w-3 mr-1" /> Copy ID
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-ink-950/70 hover:text-ink-950 hover:bg-ink-950/10" onClick={() => exportAuditJson(entry)}>
            <FileJson className="h-3 w-3 mr-1" /> Export JSON
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-ink-950/70 hover:text-ink-950 hover:bg-ink-950/10" onClick={() => exportAuditCsv(entry)}>
            <Table2 className="h-3 w-3 mr-1" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-ink-950/70 hover:text-ink-950 hover:bg-ink-950/10"
            onClick={() => navigate(`/vendors?brief=${entry.buying_brief_id}`)}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Compare vendors
          </Button>
        </div>
      </div>
    </div>
  );
}
