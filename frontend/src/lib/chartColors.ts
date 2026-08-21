/** Recharts needs literal colour values, not Tailwind classes — these are
 * the same hex values as the design tokens in index.css, kept in sync by
 * hand since there are only a handful. */
export const CHART_COLORS = {
  brand: "#0f6e64",
  money: "#a15c07",
  success: "#15803d",
  danger: "#b42318",
  textFaint: "#8890a0",
  textSoft: "#4b5468",
  border: "#e2e5eb",
  surface: "#ffffff",
  ink: "#10182b",
  /** Segment palette for the shared-pool bar / spend-by-brief chart —
   * ordered so adjacent briefs never land on visually similar hues. */
  segments: ["#0f6e64", "#a15c07", "#375ba8", "#8f6b3f", "#5b8a72"],
};
