import type { BuyingBrief, HealthResponse, PipelineResult, Vendor } from "./types";

const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the ProcureX API at ${BASE}${path}. Is the backend running? (${(e as Error).message})`
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  listBriefs: () => request<BuyingBrief[]>("/api/briefs"),
  briefVendors: (briefId: string) => request<Vendor[]>(`/api/briefs/${briefId}/vendors`),
  run: () => request<PipelineResult>("/api/run", { method: "POST" }),
  audit: () => request("/api/audit"),
  escalations: () => request("/api/escalations"),
  resolveEscalation: (id: string, resolution: string) =>
    request(`/api/escalations/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }),
  simulateOutage: (vendorId: string) =>
    request("/api/simulate/vendor-outage", {
      method: "POST",
      body: JSON.stringify({ vendor_id: vendorId }),
    }),
  simulateReset: () => request("/api/simulate/reset", { method: "POST" }),
  parseBrief: (text: string) =>
    request<Partial<BuyingBrief>>("/api/parse-brief", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  createBrief: (draft: Partial<BuyingBrief>) =>
    request<PipelineResult>("/api/briefs", {
      method: "POST",
      body: JSON.stringify(draft),
    }),
};

export const inr = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? "—"
    : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const compactInr = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 100_000) return "₹" + (n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1) + "L";
  return inr(n);
};
