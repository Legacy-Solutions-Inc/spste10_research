import type { IncidentKind } from "./metrics";

/**
 * Chart fills for the two incident types, validated as a categorical pair on the
 * white card surface (dataviz validate_palette.js, light mode):
 * - Reports keep the --report token (#db7706).
 * - Emergency Alerts use one step darker than --alert. The raw token pair sits
 *   just under the normal-vision separation floor (ΔE 14.3 < 15); #c81e1e clears
 *   it (ΔE 16.9 normal, 13.4 deuteranopia) and both stay above 3:1 contrast.
 * Text never uses these colors; they only fill marks and legend swatches.
 */
export const SERIES: Record<IncidentKind, { label: string; singular: string; color: string }> = {
  alert: { label: "Emergency Alerts", singular: "Emergency Alert", color: "#c81e1e" },
  report: { label: "Reports", singular: "Report", color: "hsl(var(--report))" },
};

export function seriesCount(kind: IncidentKind, n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? SERIES[kind].singular : SERIES[kind].label}`;
}
