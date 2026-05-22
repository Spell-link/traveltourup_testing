import "server-only";

import { Prisma } from "@/generated/prisma";
import type {
  DashboardSnapshot,
  DistributionSlice,
  FlightsDashboardData,
  KpiMetric,
  TimeSeriesPoint,
  UsersDashboardData,
} from "@/lib/admin/admin-dashboard.types";
import { buildCarDashboardMock, buildHotelDashboardMock } from "@/lib/admin/dashboard-mock-data";
import {
  effectiveGranularity,
  fillTimeSeriesGaps,
  formatBucketDate,
  pgTruncUnit,
  resolveDashboardRange,
} from "@/lib/admin/dashboard-date-range";
import { CHART_COLORS } from "@/lib/admin/dashboard-chart-config";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import type { AdminDashboardQuery } from "@/lib/validations/admin-dashboard.schema";
import { listAdminFlightOrphanPits } from "@/lib/services/admin/admin-flights.service";
import { getAdminFlightRevenueTimeSeries } from "@/lib/services/admin/admin-flight-revenue.service";

function assertDashboardAccess(authz: AuthzContext | null): void {
  if (
    !authz ||
    (!hasPermission(authz, "bookings:manage") && !hasPermission(authz, "admin.users:read"))
  ) {
    throw new ForbiddenError();
  }
}

function toSlices(
  rows: { key: string; count: bigint | number }[],
  colors?: Record<string, string>,
): DistributionSlice[] {
  return rows.map((r, i) => ({
    name: r.key,
    value: Number(r.count),
    fill: colors?.[r.key] ?? CHART_PALETTE_FALLBACK[i % 5],
  }));
}

const CHART_PALETTE_FALLBACK = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.violet,
  CHART_COLORS.danger,
];

function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

async function flightBookingVolumeSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<TimeSeriesPoint[]> {
  const trunc = pgTruncUnit(granularity);
  const rows = await prisma.$queryRaw<
    Array<{ bucket: Date; status: string; count: bigint }>
  >`
    SELECT date_trunc(${trunc}::text, created_at) AS bucket, status, COUNT(*)::bigint AS count
    FROM bookings
    WHERE type = 'flight' AND created_at >= ${from} AND created_at <= ${to}
    GROUP BY bucket, status
    ORDER BY bucket ASC
  `;

  const byDate = new Map<string, TimeSeriesPoint>();
  for (const r of rows) {
    const date = formatBucketDate(r.bucket, granularity);
    const point = byDate.get(date) ?? { date, confirmed: 0, pending: 0, cancelled: 0, failed: 0 };
    const status = r.status as keyof TimeSeriesPoint;
    if (status in point) {
      point[status] = Number(r.count);
    }
    byDate.set(date, point);
  }
  return fillTimeSeriesGaps(
    Array.from(byDate.values()),
    from,
    to,
    granularity,
    ["confirmed", "pending", "cancelled", "failed"],
  );
}

async function flightRevenueStackSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<TimeSeriesPoint[]> {
  const points = await getAdminFlightRevenueTimeSeries(from, to, granularity);
  return points.map((p) => ({
    date: p.date,
    customer_revenue: p.customer_revenue,
    commission: p.commission,
    duffel_cost: p.duffel_cost,
    duffel_fee: p.duffel_fee,
  }));
}

async function flightRevenueTotalsInRange(from: Date, to: Date) {
  const row = await prisma.$queryRaw<
    Array<{
      customer_revenue: Prisma.Decimal | null;
      commission: Prisma.Decimal | null;
      duffel_cost: Prisma.Decimal | null;
      duffel_fee: Prisma.Decimal | null;
    }>
  >`
    SELECT
      SUM(CAST(p.charge_amount AS DECIMAL)) AS customer_revenue,
      SUM(CAST(p.markup_amount AS DECIMAL)) AS commission,
      SUM(
        CAST(p.offer_amount AS DECIMAL) + COALESCE(CAST(p.services_subtotal_amount AS DECIMAL), 0)
      ) AS duffel_cost,
      SUM(COALESCE(CAST(p.duffel_payments_fee_amount AS DECIMAL), 0)) AS duffel_fee
    FROM bookings b
    INNER JOIN LATERAL (
      SELECT *
      FROM flight_payment_intent_records pit
      WHERE pit.booking_id = b.id AND pit.status = 'succeeded'
      ORDER BY pit.created_at DESC
      LIMIT 1
    ) p ON true
    WHERE b.type = 'flight' AND b.created_at >= ${from} AND b.created_at <= ${to}
  `;
  const r = row[0];
  return {
    customerRevenue: Number(r?.customer_revenue ?? 0),
    commission: Number(r?.commission ?? 0),
    duffelCost: Number(r?.duffel_cost ?? 0),
    duffelFee: Number(r?.duffel_fee ?? 0),
  };
}

async function ledgerEventSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<TimeSeriesPoint[]> {
  const trunc = pgTruncUnit(granularity);
  const rows = await prisma.$queryRaw<
    Array<{ bucket: Date; type: string; count: bigint }>
  >`
    SELECT date_trunc(${trunc}::text, e.created_at) AS bucket, e.type, COUNT(*)::bigint AS count
    FROM booking_financial_events e
    INNER JOIN bookings b ON b.id = e.booking_id
    WHERE b.type = 'flight' AND e.created_at >= ${from} AND e.created_at <= ${to}
    GROUP BY bucket, e.type
    ORDER BY bucket ASC
  `;

  const types = [
    "refund_initiated",
    "refund_succeeded",
    "refund_failed",
    "order_failed",
    "cancel_confirmed",
  ];
  const byDate = new Map<string, TimeSeriesPoint>();
  for (const r of rows) {
    const date = formatBucketDate(r.bucket, granularity);
    const point = byDate.get(date) ?? { date };
    for (const t of types) {
      if (!(t in point)) point[t] = 0;
    }
    if (types.includes(r.type)) {
      point[r.type] = Number(r.count);
    }
    byDate.set(date, point);
  }
  return fillTimeSeriesGaps(Array.from(byDate.values()), from, to, granularity, types);
}

async function userRegistrationSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<TimeSeriesPoint[]> {
  const trunc = pgTruncUnit(granularity);
  const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
    SELECT date_trunc(${trunc}::text, created_at) AS bucket, COUNT(*)::bigint AS count
    FROM users
    WHERE created_at >= ${from} AND created_at <= ${to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const points = rows.map((r) => ({
    date: formatBucketDate(r.bucket, granularity),
    registrations: Number(r.count),
  }));
  return fillTimeSeriesGaps(points, from, to, granularity, ["registrations"]);
}

async function activeBookersSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<TimeSeriesPoint[]> {
  const trunc = pgTruncUnit(granularity);
  const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
    SELECT date_trunc(${trunc}::text, created_at) AS bucket, COUNT(DISTINCT user_id)::bigint AS count
    FROM bookings
    WHERE type = 'flight' AND user_id IS NOT NULL AND created_at >= ${from} AND created_at <= ${to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  const points = rows.map((r) => ({
    date: formatBucketDate(r.bucket, granularity),
    bookers: Number(r.count),
  }));
  return fillTimeSeriesGaps(points, from, to, granularity, ["bookers"]);
}

async function buildFlightsData(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<FlightsDashboardData> {
  const flightWhere = {
    type: "flight" as const,
    created_at: { gte: from, lte: to },
  };

  const [
    totalBookings,
    statusGroups,
    paymentGroups,
    revenueTotals,
    refundExposure,
    intentGroups,
    cancelGroups,
    refundGroups,
    searchSessions,
    flightBookingsInRange,
    refundFailedCount,
    unprocessedWebhooks,
    orphanPits,
    bookingVolumeSeries,
    revenueStack,
    ledgerSeries,
  ] = await Promise.all([
    prisma.booking.count({ where: flightWhere }),
    prisma.booking.groupBy({
      by: ["status"],
      where: flightWhere,
      _count: { _all: true },
    }),
    prisma.booking.groupBy({
      by: ["payment_status"],
      where: flightWhere,
      _count: { _all: true },
    }),
    flightRevenueTotalsInRange(from, to),
    prisma.booking.count({
      where: {
        ...flightWhere,
        payment_status: {
          in: ["refund_processing", "refund_pending", "refunded", "partially_refunded", "refund_failed"],
        },
      },
    }),
    prisma.flightPaymentIntentRecord.groupBy({
      by: ["status"],
      where: { created_at: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.flightOrderCancellation.groupBy({
      by: ["status"],
      where: { created_at: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.flightPaymentRefundAttempt.groupBy({
      by: ["status"],
      where: { created_at: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.flightSearchSession.count({
      where: { created_at: { gte: from, lte: to } },
    }),
    prisma.booking.count({ where: flightWhere }),
    prisma.booking.count({
      where: { ...flightWhere, payment_status: "refund_failed" },
    }),
    prisma.duffelWebhookEvent.count({
      where: { processed_at: null, received_at: { gte: from, lte: to } },
    }),
    listAdminFlightOrphanPits(),
    flightBookingVolumeSeries(from, to, granularity),
    flightRevenueStackSeries(from, to, granularity),
    ledgerEventSeries(from, to, granularity),
  ]);

  const confirmed = statusGroups.find((s) => s.status === "confirmed")?._count._all ?? 0;
  const failed = statusGroups.find((s) => s.status === "failed")?._count._all ?? 0;
  const cancelled = statusGroups.find((s) => s.status === "cancelled")?._count._all ?? 0;
  const denom = confirmed + failed + cancelled;
  const confirmationRate = denom > 0 ? (confirmed / denom) * 100 : 0;
  const searchConversionPct =
    searchSessions > 0 ? (flightBookingsInRange / searchSessions) * 100 : 0;

  const statusColors: Record<string, string> = {
    confirmed: CHART_COLORS.success,
    pending: CHART_COLORS.warning,
    cancelled: CHART_COLORS.muted,
    failed: CHART_COLORS.danger,
  };

  const kpis: KpiMetric[] = [
    { id: "bookings", title: "Flight bookings", value: String(totalBookings) },
    {
      id: "customer_revenue",
      title: "Customer revenue",
      value: formatMoney(revenueTotals.customerRevenue),
      subtitle: "Card charges (succeeded PITs)",
    },
    {
      id: "commission",
      title: "Gross commission",
      value: formatMoney(revenueTotals.commission),
      subtitle: "Markup on fare + extras",
    },
    {
      id: "duffel_fees",
      title: "Duffel fees",
      value: formatMoney(revenueTotals.duffelFee),
      subtitle: "Payments processing",
    },
    {
      id: "duffel_cost",
      title: "Duffel cost",
      value: formatMoney(revenueTotals.duffelCost),
      subtitle: "Airline + ancillaries",
    },
    {
      id: "confirm",
      title: "Confirmation rate",
      value: `${confirmationRate.toFixed(1)}%`,
      variant: confirmationRate >= 80 ? "success" : "warning",
    },
    {
      id: "refund",
      title: "Refund exposure",
      value: String(refundExposure),
      variant: refundExposure > 0 ? "warning" : "default",
    },
    {
      id: "conversion",
      title: "Search → book",
      value: `${searchConversionPct.toFixed(1)}%`,
      subtitle: `${flightBookingsInRange} / ${searchSessions} searches`,
    },
  ];

  return {
    meta: { source: "live" },
    kpis,
    bookingVolumeSeries,
    revenueStackSeries: revenueStack,
    bookingStatusMix: toSlices(
      statusGroups.map((s) => ({ key: s.status, count: s._count._all })),
      statusColors,
    ),
    paymentStatusMix: toSlices(
      paymentGroups.map((s) => ({ key: s.payment_status, count: s._count._all })),
    ),
    paymentIntentFunnel: toSlices(
      intentGroups.map((s) => ({ key: s.status, count: s._count._all })),
    ),
    cancellationMix: toSlices(
      cancelGroups.map((s) => ({ key: s.status, count: s._count._all })),
    ),
    refundAttemptMix: toSlices(
      refundGroups.map((s) => ({ key: s.status, count: s._count._all })),
    ),
    ledgerEventSeries: ledgerSeries,
    searchSessions,
    flightBookings: flightBookingsInRange,
    searchConversionPct,
    ops: {
      orphanPitCount: orphanPits.orphan.length,
      postCaptureFailedCount: orphanPits.post_capture_failed.length,
      unprocessedWebhooks,
      refundFailedBookings: refundFailedCount,
    },
  };
}

async function buildUsersData(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<UsersDashboardData> {
  const [newUsers, totalUsers, roleRows, regSeries, bookersSeries] = await Promise.all([
    prisma.user.count({ where: { created_at: { gte: from, lte: to } } }),
    prisma.user.count(),
    prisma.userRole.groupBy({
      by: ["role_id"],
      _count: { _all: true },
    }),
    userRegistrationSeries(from, to, granularity),
    activeBookersSeries(from, to, granularity),
  ]);

  const topRoles = [...roleRows]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8);
  const roleIds = topRoles.map((r) => r.role_id);
  const roles =
    roleIds.length > 0
      ? await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } })
      : [];
  const roleName = new Map(roles.map((r) => [r.id, r.name]));

  const kpis: KpiMetric[] = [
    { id: "total", title: "Total users", value: String(totalUsers) },
    { id: "new", title: "New registrations", value: String(newUsers) },
  ];

  return {
    meta: { source: "live" },
    kpis,
    registrationSeries: regSeries,
    activeBookersSeries: bookersSeries,
    roleDistribution: toSlices(
      topRoles.map((r) => ({
        key: roleName.get(r.role_id) ?? r.role_id,
        count: r._count._all,
      })),
    ),
  };
}

export async function getAdminDashboardSnapshot(
  authz: AuthzContext | null,
  query: AdminDashboardQuery,
): Promise<DashboardSnapshot> {
  assertDashboardAccess(authz);

  const { from, to, label } = resolveDashboardRange(query);
  const granularity = effectiveGranularity(query, from, to);

  const [flights, users] = await Promise.all([
    buildFlightsData(from, to, granularity),
    buildUsersData(from, to, granularity),
  ]);

  const hotels = buildHotelDashboardMock(query);
  const cars = buildCarDashboardMock(query);

  const opsAlerts =
    flights.ops.orphanPitCount +
    flights.ops.postCaptureFailedCount +
    flights.ops.unprocessedWebhooks +
    flights.ops.refundFailedBookings;

  return {
    query,
    rangeLabel: label,
    from: from.toISOString(),
    to: to.toISOString(),
    overview: {
      flightGmv: flights.kpis.find((k) => k.id === "customer_revenue")?.value ?? "—",
      totalFlightBookings: flights.flightBookings,
      newUsers: users.kpis.find((k) => k.id === "new")?.value
        ? Number(users.kpis.find((k) => k.id === "new")!.value)
        : 0,
      searchConversionPct: flights.searchConversionPct,
      opsAlerts,
      primaryCurrency: "USD",
    },
    flights,
    users,
    hotels,
    cars,
  };
}
