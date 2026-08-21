import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BuyingBrief, HealthResponse, PipelineResult } from "@/lib/types";

/**
 * Single source of truth for pipeline data across the whole app. One
 * fetch of /api/run seeds every page (Overview, Briefs, Vendors,
 * Approvals, Audit, Security) so they all stay in sync with the same
 * run instead of re-fetching independently.
 */
export function usePipeline() {
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, h] = await Promise.all([api.run(), api.health()]);
      setPipeline(result);
      setHealth(h);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolveEscalation = useCallback(
    async (id: string, resolution: string) => {
      await api.resolveEscalation(id, resolution);
      await load();
    },
    [load]
  );

  const simulateOutage = useCallback(
    async (vendorId: string) => {
      await api.simulateOutage(vendorId);
      await load();
    },
    [load]
  );

  const simulateReset = useCallback(async () => {
    await api.simulateReset();
    await load();
  }, [load]);

  const createBrief = useCallback(
    async (draft: Partial<BuyingBrief>) => {
      const result = await api.createBrief(draft);
      setPipeline(result);
      return result;
    },
    []
  );

  return {
    pipeline,
    health,
    loading,
    error,
    reload: load,
    resolveEscalation,
    simulateOutage,
    simulateReset,
    createBrief,
  };
}
