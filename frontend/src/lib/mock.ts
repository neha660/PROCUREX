/**
 * MOCK DATA — isolated here on purpose. The backend has no "events" or
 * "settings" concept; everything in this file is presentation-only filler
 * for the demo scenario described in the brief, and should be the first
 * thing replaced by a real events/settings API.
 */

/** Ignite '26 kickoff — used only for the Overview countdown. */
export const IGNITE_26_EVENT_DATE = new Date("2026-08-22T09:00:00+05:30");

export function daysUntilIgnite26(): number {
  const ms = IGNITE_26_EVENT_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export const MOCK_SETTINGS = {
  workspace: {
    name: "Ignite '26",
    description: "3-day technology summit · 5,000 attendees",
    sharedPoolInr: 65_00_000,
  },
  approvalLimits: [
    { role: "Logistics Coordinator", autoApproveUpToInr: 50_000, note: "Ananya's current role" },
    { role: "Procurement Lead", autoApproveUpToInr: 200_000, note: "Escalations above this still require Finance" },
    { role: "Finance Controller", autoApproveUpToInr: 65_00_000, note: "Full shared-pool authority" },
  ],
  notificationPrefs: [
    { id: "escalations", label: "New escalations", enabled: true },
    { id: "security", label: "Security events", enabled: true },
    { id: "replan", label: "Dynamic re-planning triggered", enabled: true },
    { id: "digest", label: "Daily savings digest", enabled: false },
  ],
  integrations: [
    { id: "erp", name: "ERP export (CSV/JSON)", status: "Connected" },
    { id: "gemini", name: "Gemini LLM layer", status: "Depends on GEMINI_API_KEY" },
    { id: "gstin", name: "GSTIN trust layer", status: "Connected" },
  ],
};
