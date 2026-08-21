const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

let currentRole = "REQUESTER";

export function setRole(role) {
  currentRole = role;
}

export function getRole() {
  return currentRole;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-ProcureX-Role": currentRole,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      detail = JSON.parse(body).detail || body;
    } catch {
      /* not json */
    }
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  listBriefs: () => request("/api/briefs"),
  briefVendors: (briefId) => request(`/api/briefs/${briefId}/vendors`),
  run: () => request("/api/run", { method: "POST" }),
  audit: () => request("/api/audit"),
  escalations: () => request("/api/escalations"),
  resolveEscalation: (id, resolution) =>
    request(`/api/escalations/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }),
  simulateOutage: (vendorId) =>
    request("/api/simulate/vendor-outage", {
      method: "POST",
      body: JSON.stringify({ vendor_id: vendorId }),
    }),
  simulateDuplicate: (sourceBriefId) =>
    request("/api/simulate/duplicate-brief", {
      method: "POST",
      body: JSON.stringify({ source_brief_id: sourceBriefId }),
    }),
  simulatePersonalPurchase: () =>
    request("/api/simulate/personal-purchase", { method: "POST" }),
  simulateMalformedVendor: (briefId) =>
    request("/api/simulate/malformed-vendor", {
      method: "POST",
      body: JSON.stringify({ brief_id: briefId }),
    }),
  simulateReset: () => request("/api/simulate/reset", { method: "POST" }),
  parseBrief: (text, requestedBy, costCenter) =>
    request("/api/parse-brief", {
      method: "POST",
      body: JSON.stringify({ text, requested_by: requestedBy, cost_center: costCenter }),
    }),
  listCostCenters: () => request("/api/admin/cost-centers"),
  addCostCenter: (code, label) =>
    request("/api/admin/cost-centers", { method: "POST", body: JSON.stringify({ code, label }) }),
  deactivateCostCenter: (code) =>
    request(`/api/admin/cost-centers/${code}/deactivate`, { method: "POST" }),
  listFinanceManagers: () => request("/api/admin/finance-managers"),
  addFinanceManager: (name, email) =>
    request("/api/admin/finance-managers", { method: "POST", body: JSON.stringify({ name, email }) }),
  removeFinanceManager: (id) =>
    request(`/api/admin/finance-managers/${id}/remove`, { method: "POST" }),
};

export const inr = (n) =>
  n === null || n === undefined
    ? "—"
    : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
