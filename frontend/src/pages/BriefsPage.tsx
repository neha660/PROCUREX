import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionTitle } from "@/components/shared/Primitives";
import { BriefCard } from "@/components/brief/BriefCard";
import { BriefDetailSheet } from "@/components/brief/BriefDetailSheet";
import { CardGridSkeleton, ApiErrorState, EmptyState } from "@/components/shared/PageStates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePipelineContext } from "@/hooks/usePipelineContext";
import { briefUiStatus, type BriefUiStatus } from "@/lib/types";
import { Search, ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS: ("All" | BriefUiStatus)[] = ["All", "Discovering", "Evaluating", "Ready", "Purchased", "Escalated"];

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
function briefCountWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

export function BriefsPage() {
  const { pipeline, loading, error, reload, simulateOutage, simulateReset, openCreateBrief } =
    usePipelineContext();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);

  const briefs = pipeline?.briefs ?? [];
  const filtered = useMemo(() => {
    return briefs.filter((b) => {
      if (filter !== "All" && briefUiStatus(b) !== filter) return false;
      if (query && !b.brief.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [briefs, filter, query]);

  const active = briefs.find((b) => b.brief.id === activeBriefId) || null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Buying briefs"
        description="Every procurement request Ignite '26 has raised — read together, scored against one shared pool."
        actions={
          <Button onClick={openCreateBrief} size="sm" className="bg-gold text-ink-950 hover:bg-gold-hi gap-1.5">
            <Plus className="h-4 w-4" />
            Create buying brief
          </Button>
        }
      />

      {error && <ApiErrorState message={error} onRetry={reload} />}

      {!error && (
        <section aria-labelledby="cmd-center-h">
          <SectionTitle
            eyebrow="Procurement command center"
            title={
              <span id="cmd-center-h">
                {briefCountWord(briefs.length)} brief{briefs.length === 1 ? "" : "s"}, one shared ₹65,00,000 budget
              </span>
            }
            sub="AI discovers and negotiates. Deterministic code decides. You only ever see genuine exceptions."
          />

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-dim" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search briefs…"
                className="pl-8"
                aria-label="Search briefs by title"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter briefs by status">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                    filter === f
                      ? "border-gold/50 bg-gold/10 text-gold-hi"
                      : "border-line text-text-mid hover:bg-ink-800"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading && !pipeline && <CardGridSkeleton />}

          {!loading && pipeline && filtered.length === 0 && (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title={briefs.length === 0 ? "No briefs yet" : "No briefs match this filter"}
              description={
                briefs.length === 0
                  ? "Create your first procurement brief and ProcureX will discover, score, and negotiate vendors automatically."
                  : "Try a different status filter or clear your search."
              }
              action={
                briefs.length === 0 && (
                  <Button onClick={openCreateBrief} size="sm" className="bg-gold text-ink-950 hover:bg-gold-hi">
                    Create buying brief
                  </Button>
                )
              }
            />
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((b) => (
              <BriefCard key={b.brief.id} summary={b} onOpenDetail={() => setActiveBriefId(b.brief.id)} />
            ))}
          </div>
        </section>
      )}

      <BriefDetailSheet
        summary={active}
        open={!!active}
        onOpenChange={(o) => !o && setActiveBriefId(null)}
        onSimulateOutage={simulateOutage}
        onReset={simulateReset}
      />
    </div>
  );
}
