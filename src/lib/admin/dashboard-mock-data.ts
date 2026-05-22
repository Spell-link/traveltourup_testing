import type {
  CarsDashboardData,
  DistributionSlice,
  HotelsDashboardData,
  KpiMetric,
  TimeSeriesPoint,
} from "@/lib/admin/admin-dashboard.types";
import type { AdminDashboardQuery } from "@/lib/validations/admin-dashboard.schema";
import {
  effectiveGranularity,
  fillTimeSeriesGaps,
  formatBucketDate,
  resolveDashboardRange,
} from "@/lib/admin/dashboard-date-range";

function seeded(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildSeries(
  query: AdminDashboardQuery,
  seed: number,
  keys: string[],
  scale: number,
): TimeSeriesPoint[] {
  const { from, to } = resolveDashboardRange(query);
  const granularity = effectiveGranularity(query, from, to);
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const step = granularity === "week" ? 7 : 1;
  const raw: TimeSeriesPoint[] = [];
  let i = 0;
  while (cursor <= to && raw.length < 120) {
    const date = formatBucketDate(cursor, granularity);
    const row: TimeSeriesPoint = { date };
    for (const k of keys) {
      row[k] = Math.round((0.4 + seeded(seed, i + k.length) * 0.9) * scale);
    }
    raw.push(row);
    cursor.setUTCDate(cursor.getUTCDate() + step);
    i += 1;
  }
  return fillTimeSeriesGaps(raw, from, to, granularity, keys);
}

export function buildHotelDashboardMock(query: AdminDashboardQuery): HotelsDashboardData {
  const seed = 42;
  const bookingsSeries = buildSeries(query, seed, ["bookings"], 12);
  const totalBookings = bookingsSeries.reduce((s, p) => s + Number(p.bookings ?? 0), 0);
  const revenue = Math.round(totalBookings * (120 + seeded(seed, 1) * 180));

  const kpis: KpiMetric[] = [
    { id: "bookings", title: "Bookings", value: String(totalBookings) },
    { id: "revenue", title: "Revenue", value: `$${revenue.toLocaleString()}`, subtitle: "Preview USD" },
    { id: "adr", title: "Avg nightly rate", value: `$${(95 + seeded(seed, 2) * 120).toFixed(0)}` },
    {
      id: "cancel",
      title: "Cancellation rate",
      value: `${(4 + seeded(seed, 3) * 8).toFixed(1)}%`,
      variant: "warning",
    },
  ];

  const revenueByDestination: DistributionSlice[] = [
    { name: "Paris", value: Math.round(revenue * 0.28) },
    { name: "London", value: Math.round(revenue * 0.22) },
    { name: "Dubai", value: Math.round(revenue * 0.18) },
    { name: "New York", value: Math.round(revenue * 0.16) },
    { name: "Tokyo", value: Math.round(revenue * 0.16) },
  ];

  const starRatingMix: DistributionSlice[] = [
    { name: "5★", value: 35 },
    { name: "4★", value: 42 },
    { name: "3★", value: 18 },
    { name: "Other", value: 5 },
  ];

  const statusMix: DistributionSlice[] = [
    { name: "confirmed", value: Math.round(totalBookings * 0.82) },
    { name: "pending", value: Math.round(totalBookings * 0.1) },
    { name: "cancelled", value: Math.round(totalBookings * 0.08) },
  ];

  return {
    meta: { source: "mock", label: "Preview data" },
    kpis,
    bookingsSeries,
    revenueByDestination,
    starRatingMix,
    statusMix,
  };
}

export function buildCarDashboardMock(query: AdminDashboardQuery): CarsDashboardData {
  const seed = 77;
  const rentalsSeries = buildSeries(query, seed, ["rentals"], 8);
  const totalRentals = rentalsSeries.reduce((s, p) => s + Number(p.rentals ?? 0), 0);
  const revenue = Math.round(totalRentals * (45 + seeded(seed, 4) * 55));

  const kpis: KpiMetric[] = [
    { id: "rentals", title: "Rentals", value: String(totalRentals) },
    { id: "revenue", title: "Revenue", value: `$${revenue.toLocaleString()}`, subtitle: "Preview USD" },
    { id: "days", title: "Avg rental days", value: `${(3 + seeded(seed, 5) * 4).toFixed(1)}` },
    {
      id: "util",
      title: "Fleet utilization",
      value: `${Math.round(62 + seeded(seed, 6) * 22)}%`,
      variant: "success",
    },
  ];

  const revenueByAirport: DistributionSlice[] = [
    { name: "LAX", value: Math.round(revenue * 0.26) },
    { name: "JFK", value: Math.round(revenue * 0.24) },
    { name: "LHR", value: Math.round(revenue * 0.2) },
    { name: "DXB", value: Math.round(revenue * 0.18) },
    { name: "SIN", value: Math.round(revenue * 0.12) },
  ];

  const transmissionMix: DistributionSlice[] = [
    { name: "Automatic", value: 68 },
    { name: "Manual", value: 32 },
  ];

  const weekdayWeekendMix: DistributionSlice[] = [
    { name: "Weekday", value: 58 },
    { name: "Weekend", value: 42 },
  ];

  return {
    meta: { source: "mock", label: "Preview data" },
    kpis,
    rentalsSeries,
    revenueByAirport,
    transmissionMix,
    weekdayWeekendMix,
  };
}
