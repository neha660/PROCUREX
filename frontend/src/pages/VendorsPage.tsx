import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState, TableSkeleton, EmptyState } from "@/components/shared/PageStates";
import { VendorDiscoveryTable } from "@/components/vendor/VendorDiscoveryTable";
import { VendorDetailSheet } from "@/components/vendor/VendorDetailSheet";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import { buildVendorRows, type VendorRow } from "@/lib/vendorRows";
import { Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const HARD_FILTERS = ["All vendors", "Passed", "Failed"] as const;

export function VendorsPage() {
  const { pipeline, loading, error, reload } = usePipelineContext();
  const [searchParams] = useSearchParams();
  const [briefFilter, setBriefFilter] = useState(searchParams.get("brief") || "all");
  const [hardFilter, setHardFilter] = useState<(typeof HARD_FILTERS)[number]>("All vendors");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VendorRow | null>(null);

  const allRows = useMemo(() => buildVendorRows(pipeline), [pipeline]);

  const rows = useMemo(() => {
    return allRows
      .filter((r) => briefFilter === "all" || r.brief.id === briefFilter)
      .filter((r) => {
        if (hardFilter === "Passed") return r.firewallResult.passed;
        if (hardFilter === "Failed") return !r.firewallResult.passed;
        return true;
      })
      .filter((r) => !query || r.vendor.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.scored?.total_score ?? -1) - (a.scored?.total_score ?? -1));
  }, [allRows, briefFilter, hardFilter, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vendor discovery"
        description="Every candidate vendor evaluated this run — hard-filtered first, then ranked. A vendor that fails one hard constraint never becomes selectable, no matter how cheap."
      />

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Weighted score model
              </h3>
              <p className="text-sm text-ink-soft">
                Price <span className="text-money font-medium">40%</span> · Reliability &amp; warranty{" "}
                <span className="text-success font-medium">30%</span> · Delivery{" "}
                <span className="text-brand font-medium">20%</span> · Return/refund policy{" "}
                <span className="text-ink font-medium">10%</span> — applied only to vendors that already
                cleared the hard-constraint firewall.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-faint" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendors…"
                className="pl-8"
                aria-label="Search vendors by name"
              />
            </div>

            <Select value={briefFilter} onValueChange={setBriefFilter}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by brief">
                <SelectValue placeholder="All briefs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All briefs</SelectItem>
                {pipeline?.briefs.map((b) => (
                  <SelectItem key={b.brief.id} value={b.brief.id}>
                    {b.brief.title.split(" — ").pop()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1.5" role="group" aria-label="Filter by hard-filter result">
              {HARD_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setHardFilter(f)}
                  aria-pressed={hardFilter === f}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
                    hardFilter === f
                      ? "border-brand/40 bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-muted"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading && !pipeline && <TableSkeleton rows={6} />}

          {!loading && pipeline && rows.length === 0 && (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No vendors match these filters"
              description="Try clearing the search or switching the brief / hard-filter selection."
            />
          )}

          {rows.length > 0 && <VendorDiscoveryTable rows={rows} onSelect={setSelected} />}
        </>
      )}

      <VendorDetailSheet row={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
