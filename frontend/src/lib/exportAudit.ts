import type { AuditEntry } from "@/lib/types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportAuditJson(entry: AuditEntry) {
  download(`${entry.transaction_id}.json`, JSON.stringify(entry, null, 2), "application/json");
}

const FLAT_FIELDS: (keyof AuditEntry)[] = [
  "transaction_id",
  "buying_brief_id",
  "status",
  "quantity",
  "max_unit_budget_inr",
  "max_delivery_days",
  "evaluated_vendors_count",
  "selected_vendor",
  "unit_price",
  "delivery_days",
  "authorisation_status",
  "audit_hash",
  "timestamp",
];

export function exportAuditCsv(entry: AuditEntry) {
  const header = FLAT_FIELDS.join(",");
  const row = FLAT_FIELDS.map((f) => {
    const v = entry[f];
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  }).join(",");
  download(`${entry.transaction_id}.csv`, `${header}\n${row}`, "text/csv");
}
