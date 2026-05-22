import type { AdminDashboardQuery } from "@/lib/validations/admin-dashboard.schema";

export type DataSourceMeta = {
  source: "live" | "mock";
  label?: string;
};

export type KpiMetric = {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
};

export type TimeSeriesPoint = {
  date: string;
  [key: string]: string | number;
};

export type DistributionSlice = {
  name: string;
  value: number;
  fill?: string;
};

export type OpsHealthMetrics = {
  orphanPitCount: number;
  postCaptureFailedCount: number;
  unprocessedWebhooks: number;
  refundFailedBookings: number;
};

export type FlightsDashboardData = {
  meta: DataSourceMeta;
  kpis: KpiMetric[];
  bookingVolumeSeries: TimeSeriesPoint[];
  /** Customer revenue, commission, Duffel cost, and payment fees by period. */
  revenueStackSeries: TimeSeriesPoint[];
  bookingStatusMix: DistributionSlice[];
  paymentStatusMix: DistributionSlice[];
  paymentIntentFunnel: DistributionSlice[];
  cancellationMix: DistributionSlice[];
  refundAttemptMix: DistributionSlice[];
  ledgerEventSeries: TimeSeriesPoint[];
  searchSessions: number;
  flightBookings: number;
  searchConversionPct: number;
  ops: OpsHealthMetrics;
};

export type UsersDashboardData = {
  meta: DataSourceMeta;
  kpis: KpiMetric[];
  registrationSeries: TimeSeriesPoint[];
  activeBookersSeries: TimeSeriesPoint[];
  roleDistribution: DistributionSlice[];
};

export type HotelsDashboardData = {
  meta: DataSourceMeta;
  kpis: KpiMetric[];
  bookingsSeries: TimeSeriesPoint[];
  revenueByDestination: DistributionSlice[];
  starRatingMix: DistributionSlice[];
  statusMix: DistributionSlice[];
};

export type CarsDashboardData = {
  meta: DataSourceMeta;
  kpis: KpiMetric[];
  rentalsSeries: TimeSeriesPoint[];
  revenueByAirport: DistributionSlice[];
  transmissionMix: DistributionSlice[];
  weekdayWeekendMix: DistributionSlice[];
};

export type PlatformOverview = {
  flightGmv: string;
  totalFlightBookings: number;
  newUsers: number;
  searchConversionPct: number;
  opsAlerts: number;
  primaryCurrency: string;
};

export type DashboardSnapshot = {
  query: AdminDashboardQuery;
  rangeLabel: string;
  from: string;
  to: string;
  overview: PlatformOverview;
  flights: FlightsDashboardData;
  users: UsersDashboardData;
  hotels: HotelsDashboardData;
  cars: CarsDashboardData;
};
