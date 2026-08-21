import { useState } from "react";
import { ChevronDown, FileCheck2 } from "lucide-react";
import { inr } from "../api";
import { StatusPill, AiTag, CodeTag } from "./Primitives";

function Field({ label, value, mono = false, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[11px] text-text-dim">{label}</div>
      <div
        className={`truncate text-sm text-text-hi ${mono ? "font-mono text-[12.5px]" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function AuditReceipt({ entry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(20,23,43,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-surface-muted/60 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileCheck2 size={15} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-[12.5px] font-medium text-text-hi">{entry.transaction_id}</div>
            <div className="text-[11px] text-text-dim">Audit receipt</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CodeTag>{entry.authorisation_status}</CodeTag>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
        <Field label="Brief" value={entry.buying_brief_id} mono />
        <Field label="Requested by" value={entry.requested_by} />
        <Field label="Cost center" value={entry.cost_center} mono />
        <Field label="Quantity" value={entry.quantity} />
        <Field label="Selected vendor" value={entry.selected_vendor} />
        <Field label="Unit price" value={inr(entry.unit_price)} />
        <Field label="Delivery" value={entry.delivery_days ? `${entry.delivery_days} days` : "—"} />
        <Field label="Vendors evaluated" value={entry.evaluated_vendors_count} />
        <Field label="Audit hash" value={entry.audit_hash} mono className="col-span-2" />
      </div>

      <div className="border-t border-border px-5 py-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="text-[11px] text-text-dim">Selection reasoning</div>
          <AiTag>LLM-written</AiTag>
        </div>
        <p className="text-sm leading-relaxed text-text-mid">{entry.selection_reasoning}</p>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border px-5 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="text-[11px] text-text-dim">Counterfactual analysis</div>
              <AiTag>LLM-written</AiTag>
            </div>
            <p className="text-sm leading-relaxed text-text-mid">{entry.counterfactual_analysis}</p>
          </div>

          {entry.negotiation?.bulk_tier_applied && (
            <div>
              <div className="text-[11px] text-text-dim">Negotiation</div>
              <p className="mt-1 text-sm leading-relaxed text-text-mid">
                {inr(entry.negotiation.original_unit_price_inr)} → {inr(entry.negotiation.negotiated_unit_price_inr)}
                {" "}· saved {inr(entry.negotiation.savings_total_inr)} total
              </p>
            </div>
          )}

          {entry.replan_events?.length > 0 && (
            <div>
              <div className="text-[11px] text-text-dim">Replan events</div>
              {entry.replan_events.map((ev, i) => (
                <p key={i} className="mt-1 text-sm leading-relaxed text-text-mid">
                  {ev.trigger} → {ev.note}
                </p>
              ))}
            </div>
          )}

          {entry.governance_flag && (
            <div>
              <div className="text-[11px] text-danger-600">Business justification gate</div>
              <p className="mt-1 break-words text-sm leading-relaxed text-danger-700">
                {entry.governance_flag}
              </p>
            </div>
          )}

          {entry.security_events?.length > 0 && (
            <div>
              <div className="text-[11px] text-danger-600">Security events</div>
              {entry.security_events.map((ev, i) => (
                <p key={i} className="mt-1 break-words text-sm leading-relaxed text-danger-700">
                  {ev}
                </p>
              ))}
            </div>
          )}

          {entry.excluded_vendors?.length > 0 && (
            <div>
              <div className="text-[11px] text-text-dim">Excluded vendors</div>
              {entry.excluded_vendors.map((v, i) => (
                <p key={i} className="mt-1 break-words text-sm leading-relaxed text-text-mid">
                  <span className="font-mono text-[12px]">{v.vendor_id}</span> — {v.reasons_failed.join(", ")}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border px-5 py-2.5 text-xs font-medium text-text-mid transition-colors hover:bg-surface-muted"
      >
        {open ? "Collapse" : "Expand full receipt"}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
