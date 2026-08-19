import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState, CardGridSkeleton, EmptyState } from "@/components/shared/PageStates";
import { AuditReceipt } from "@/components/audit/AuditReceipt";
import { Input } from "@/components/ui/input";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import { ScrollText, Search } from "lucide-react";

export function AuditPage() {
  const { pipeline, loading, error, reload } = usePipelineContext();
  const [query, setQuery] = useState("");
  const location = useLocation();

  const entries = useMemo(() => (pipeline?.briefs ?? []).map((b) => b.audit_entry), [pipeline]);
  const filtered = entries.filter(
    (e) =>
      !query ||
      e.transaction_id.toLowerCase().includes(query.toLowerCase()) ||
      (e.selected_vendor || "").toLowerCase().includes(query.toLowerCase()) ||
      e.buying_brief_id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!location.hash || loading) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-gold");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-gold"), 2000);
      return () => clearTimeout(t);
    }
  }, [location.hash, loading, pipeline]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit trail"
        description="Every field is structured data — pipes straight into an ERP or spreadsheet export. audit_hash gives a tamper-evident fingerprint for reconciliation."
      />

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-dim" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by transaction ID, vendor, or brief…"
              className="pl-8"
              aria-label="Search audit receipts"
            />
          </div>

          {loading && !pipeline && <CardGridSkeleton />}

          {!loading && pipeline && filtered.length === 0 && (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" />}
              title={entries.length === 0 ? "No audit entries yet" : "No receipts match your search"}
              description={
                entries.length === 0
                  ? "Run the pipeline from a buying brief to generate a finance-ready decision receipt."
                  : "Try a different transaction ID, vendor, or brief."
              }
            />
          )}

          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((entry) => (
              <AuditReceipt key={entry.transaction_id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
