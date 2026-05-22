import type { ChartConfig } from "@/components/admin_ui/ui/chart";
import type { DistributionSlice } from "@/lib/admin/admin-dashboard.types";

/** Recharts needs real color strings — not hsl(var(--chart-N)) when vars are hex. */
export const CHART_COLORS = {
  primary: "#0e90c7",
  primaryLight: "#33b3e7",
  success: "#059669",
  successLight: "#34d399",
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  violet: "#8b5cf6",
  violetLight: "#a78bfa",
  danger: "#ef4444",
  dangerLight: "#f87171",
  muted: "#94a3b8",
  indigo: "#6366f1",
  teal: "#14b8a6",
  rose: "#f43f5e",
};

export const CHART_PALETTE: string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.violet,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
  CHART_COLORS.rose,
  CHART_COLORS.primaryLight,
];

export function chartPaletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]!;
}

/** Attach theme fills when slices omit `fill` (mock + live distributions). */
export function withChartPalette(slices: DistributionSlice[]): DistributionSlice[] {
  return slices.map((s, i) => ({
    ...s,
    fill: s.fill ?? chartPaletteColor(i),
  }));
}

export const bookingStatusChartConfig: ChartConfig = {
  confirmed: { label: "Confirmed", color: CHART_COLORS.success },
  pending: { label: "Pending", color: CHART_COLORS.warning },
  cancelled: { label: "Cancelled", color: CHART_COLORS.muted },
  failed: { label: "Failed", color: CHART_COLORS.danger },
};

export const hotelStatusChartConfig: ChartConfig = {
  confirmed: { label: "Confirmed", color: CHART_COLORS.success },
  pending: { label: "Pending", color: CHART_COLORS.warning },
  cancelled: { label: "Cancelled", color: CHART_COLORS.muted },
};

export const hotelStarRatingChartConfig: ChartConfig = {
  "5★": { label: "5★", color: CHART_COLORS.warning },
  "4★": { label: "4★", color: CHART_COLORS.primary },
  "3★": { label: "3★", color: CHART_COLORS.teal },
  Other: { label: "Other", color: CHART_COLORS.muted },
};

export const carTransmissionChartConfig: ChartConfig = {
  Automatic: { label: "Automatic", color: CHART_COLORS.primary },
  Manual: { label: "Manual", color: CHART_COLORS.violet },
};

export const carWeekdayChartConfig: ChartConfig = {
  Weekday: { label: "Weekday", color: CHART_COLORS.indigo },
  Weekend: { label: "Weekend", color: CHART_COLORS.teal },
};

export const gmvMarkupChartConfig: ChartConfig = {
  gmv: { label: "GMV", color: CHART_COLORS.primary },
  markup: { label: "Markup", color: CHART_COLORS.violet },
};

export const flightRevenueStackChartConfig: ChartConfig = {
  customer_revenue: { label: "Customer revenue", color: CHART_COLORS.primary },
  commission: { label: "Commission", color: CHART_COLORS.violet },
  duffel_cost: { label: "Duffel cost", color: CHART_COLORS.warning },
  duffel_fee: { label: "Duffel fees", color: CHART_COLORS.muted },
};
