import "server-only";

import { Prisma } from "@/generated/prisma";
import type {
  AdminFlightBookingRevenueListResult,
  AdminFlightBookingRevenueRow,
  AdminFlightRevenueSummary,
  AdminFlightRevenueTimeSeriesPoint,
  AdminFlightBookingRevenueDetail,
} from "@/lib/admin/admin-flight-revenue.types";
import {
  computeFlightRevenueFromPit,
  type PitRevenueInput,
  type ReconciliationLine,
} from "@/lib/payments/flight-revenue-breakdown";
import { prisma } from "@/lib/prisma";
import type { AdminFlightBookingListQuery } from "@/lib/validations/admin-flights.schema";
import { pgTruncUnit, formatBucketDate, fillTimeSeriesGaps } from "@/lib/admin/dashboard-date-range";

const ALLOWED_STATUS = new Set(["pending", "confirmed", "cancelled", "failed"]);

const BOOKING_SORT_FIELDS = {
  created_at: "created_at",
  booking_ref_no: "booking_ref_no",
  status: "status",
} as const;

function pitToInput(pit: {
  charge_amount: string;
  charge_currency: string;
  offer_amount: string;
  services_subtotal_amount: string | null;
  markup_amount: string;
  subtotal_charged_amount: string | null;
  duffel_payments_fee_amount: string | null;
  duffel_payments_fee_rate: string | null;
}): PitRevenueInput {
  return {
    charge_amount: pit.charge_amount,
    charge_currency: pit.charge_currency,
    offer_amount: pit.offer_amount,
    services_subtotal_amount: pit.services_subtotal_amount,
    markup_amount: pit.markup_amount,
    subtotal_charged_amount: pit.subtotal_charged_amount,
    duffel_payments_fee_amount: pit.duffel_payments_fee_amount,
    duffel_payments_fee_rate: pit.duffel_payments_fee_rate,
  };
}

function sumMajor(values: string[]): string {
  const n = values.reduce((acc, v) => acc + Number.parseFloat(v || "0"), 0);
  return (Math.round(n * 100) / 100).toFixed(2);
}

function primarySucceededPit<
  T extends { status: string; created_at: Date },
>(pits: T[]): T | null {
  const succeeded = pits.filter((p) => p.status.toLowerCase() === "succeeded");
  if (succeeded.length === 0) return pits[0] ?? null;
  return succeeded.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;
}

function buildBookingWhere(
  query: AdminFlightBookingListQuery & { from?: string; to?: string },
): Prisma.BookingWhereInput {
  const createdAt: Prisma.DateTimeFilter | undefined =
    query.from || query.to
      ? {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        }
      : undefined;

  return {
    type: "flight",
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(query.status && ALLOWED_STATUS.has(query.status) ? { status: query.status } : {}),
    ...(query.q && query.q.trim().length > 0
      ? {
          OR: [
            { booking_ref_no: { contains: query.q.trim(), mode: "insensitive" } },
            {
              flightBooking: {
                booking_reference: { contains: query.q.trim(), mode: "insensitive" },
              },
            },
            {
              flightBooking: {
                duffel_order_id: { contains: query.q.trim(), mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
}

async function refundContextForBooking(bookingId: string, status: string) {
  const fb = await prisma.flightBooking.findUnique({
    where: { booking_id: bookingId },
    select: { id: true },
  });
  const [cancellations, refunds] = await Promise.all([
    fb
      ? prisma.flightOrderCancellation.findMany({
          where: { flight_booking_id: fb.id },
          orderBy: { created_at: "desc" },
          take: 1,
        })
      : Promise.resolve([]),
    prisma.flightPaymentRefundAttempt.findMany({
      where: { booking_id: bookingId, status: "succeeded" },
      orderBy: { created_at: "desc" },
    }),
  ]);
  const cancel = cancellations[0];
  const cardRefund = refunds.reduce(
    (acc, r) => acc + Number.parseFloat(r.amount ?? "0"),
    0,
  );
  return {
    booking_status: status,
    cancellation_refund_amount: cancel?.refund_amount ?? null,
    card_refund_amount: cardRefund > 0 ? cardRefund.toFixed(2) : null,
  };
}

export function buildReconciliationLines(input: {
  breakdown: ReturnType<typeof computeFlightRevenueFromPit>;
  duffel_order_id: string | null;
  duffel_intent_id: string | null;
  airline_pnr: string | null;
  airline_name?: string | null;
  booking_created_at: string;
  cancellation_refund_amount?: string | null;
  cancellation_refund_currency?: string | null;
  cancel_confirmed_at?: string | null;
}): ReconciliationLine[] {
  const { breakdown: b } = input;
  const currency = b.currency;
  const at = input.booking_created_at;
  const lines: ReconciliationLine[] = [
    {
      type: "order",
      label: "Order",
      reference: input.duffel_order_id,
      description: input.airline_name ?? "Airline",
      amount: b.duffel_cost,
      currency,
      balance_impact: `-${b.duffel_cost}`,
      at,
    },
    {
      type: "fees",
      label: "Fees",
      reference: input.duffel_intent_id,
      description: "Duffel Payments",
      amount: b.duffel_payment_fee,
      currency,
      balance_impact: `-${b.duffel_payment_fee}`,
      at,
    },
    {
      type: "payment",
      label: "Payment",
      reference: input.duffel_intent_id,
      description: "Card payment",
      amount: b.customer_paid,
      currency,
      balance_impact: b.customer_paid,
      at,
    },
  ];
  if (input.cancellation_refund_amount && input.cancel_confirmed_at) {
    lines.push({
      type: "order_cancelled",
      label: "Order cancelled",
      reference: input.duffel_order_id,
      description: input.airline_pnr ? `PNR ${input.airline_pnr}` : "Cancellation credit",
      amount: input.cancellation_refund_amount,
      currency: input.cancellation_refund_currency ?? currency,
      balance_impact: input.cancellation_refund_amount,
      at: input.cancel_confirmed_at,
    });
  }
  return lines;
}

export async function getFlightRevenueBreakdownForBooking(
  bookingId: string,
): Promise<ReturnType<typeof computeFlightRevenueFromPit> | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      flightPaymentIntents: { orderBy: { created_at: "desc" } },
    },
  });
  if (!booking || booking.type !== "flight") return null;
  const pit = primarySucceededPit(booking.flightPaymentIntents);
  if (!pit) return null;
  const refundCtx = await refundContextForBooking(bookingId, booking.status);
  return computeFlightRevenueFromPit(pitToInput(pit), refundCtx);
}

export async function getAdminFlightBookingRevenueDetail(
  bookingId: string,
): Promise<AdminFlightBookingRevenueDetail | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      flightBooking: true,
      flightPaymentIntents: { orderBy: { created_at: "desc" } },
    },
  });
  if (!booking || booking.type !== "flight") return null;

  const pit = primarySucceededPit(booking.flightPaymentIntents);
  if (!pit) {
    return { revenue: null, reconciliation: [], pit: null };
  }

  const cancellations = booking.flightBooking
    ? await prisma.flightOrderCancellation.findMany({
        where: { flight_booking_id: booking.flightBooking.id },
        orderBy: { created_at: "desc" },
        take: 1,
      })
    : [];
  const cancel = cancellations[0];
  const refundCtx = await refundContextForBooking(booking.id, booking.status);
  const revenue = computeFlightRevenueFromPit(pitToInput(pit), refundCtx);
  const reconciliation = buildReconciliationLines({
    breakdown: revenue,
    duffel_order_id: booking.flightBooking?.duffel_order_id ?? null,
    duffel_intent_id: pit.duffel_intent_id,
    airline_pnr: booking.flightBooking?.booking_reference ?? null,
    booking_created_at: booking.created_at.toISOString(),
    cancellation_refund_amount: cancel?.refund_amount ?? null,
    cancellation_refund_currency: cancel?.refund_currency ?? null,
    cancel_confirmed_at: cancel?.confirmed_at?.toISOString() ?? null,
  });

  return {
    revenue,
    reconciliation,
    pit: {
      duffel_intent_id: pit.duffel_intent_id,
      services_subtotal_amount: pit.services_subtotal_amount,
      duffel_reported_fees_amount: pit.duffel_reported_fees_amount,
      duffel_reported_net_amount: pit.duffel_reported_net_amount,
    },
  };
}

export async function listAdminFlightBookingsWithRevenue(
  query: AdminFlightBookingListQuery & { from?: string; to?: string },
): Promise<AdminFlightBookingRevenueListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(10, query.limit ?? 25));
  const skip = (page - 1) * limit;
  const sortField = query.sort && query.sort in BOOKING_SORT_FIELDS ? query.sort : "created_at";
  const order = query.order === "asc" ? "asc" : "desc";
  const where = buildBookingWhere(query);

  const [rows, total, allForSummary] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
      include: {
        flightBooking: {
          select: { duffel_order_id: true, booking_reference: true },
        },
        user: { select: { first_name: true, last_name: true } },
        flightPaymentIntents: { orderBy: { created_at: "desc" } },
      },
    }),
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        flightPaymentIntents: {
          where: { status: "succeeded" },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const items: AdminFlightBookingRevenueRow[] = await Promise.all(
    rows.map(async (row) => {
      const pit = primarySucceededPit(row.flightPaymentIntents);
      const refundCtx = pit
        ? await refundContextForBooking(row.id, row.status)
        : undefined;
      return {
        id: row.id,
        booking_ref_no: row.booking_ref_no,
        status: row.status,
        payment_status: row.payment_status,
        airline_total: row.total_amount.toString(),
        currency: row.currency,
        duffel_order_id: row.flightBooking?.duffel_order_id ?? null,
        airline_pnr: row.flightBooking?.booking_reference ?? null,
        user_name: row.user
          ? `${row.user.first_name} ${row.user.last_name}`.trim() || null
          : null,
        created_at: row.created_at.toISOString(),
        revenue: pit ? computeFlightRevenueFromPit(pitToInput(pit), refundCtx) : null,
      };
    }),
  );

  const summary = buildSummaryFromBookings(allForSummary);

  return { items, total, page, limit, summary };
}

function buildSummaryFromBookings(
  bookings: Array<{
    flightPaymentIntents: Array<{
      charge_amount: string;
      charge_currency: string;
      offer_amount: string;
      services_subtotal_amount: string | null;
      markup_amount: string;
      subtotal_charged_amount: string | null;
      duffel_payments_fee_amount: string | null;
      duffel_payments_fee_rate: string | null;
    }>;
    status: string;
    id: string;
  }>,
): AdminFlightRevenueSummary | null {
  const revenues: ReturnType<typeof computeFlightRevenueFromPit>[] = [];
  const currencies = new Set<string>();

  for (const b of bookings) {
    const pit = b.flightPaymentIntents[0];
    if (!pit) continue;
    currencies.add(pit.charge_currency);
    revenues.push(computeFlightRevenueFromPit(pitToInput(pit), { booking_status: b.status }));
  }

  if (revenues.length === 0) return null;

  const currency = currencies.size === 1 ? [...currencies][0]! : "USD";

  return {
    customer_revenue: sumMajor(revenues.map((r) => r.customer_paid)),
    duffel_cost: sumMajor(revenues.map((r) => r.duffel_cost)),
    commission: sumMajor(revenues.map((r) => r.commission)),
    duffel_fees: sumMajor(revenues.map((r) => r.duffel_payment_fee)),
    net_commission: sumMajor(
      revenues.map((r) => r.net_commission ?? r.commission),
    ),
    currency,
    booking_count: revenues.length,
    ...(currencies.size > 1
      ? { multi_currency_note: "Totals sum mixed currencies (v1)." }
      : {}),
  };
}

export async function getAdminFlightRevenueSummary(input: {
  from: Date;
  to: Date;
  status?: string;
  currency?: string;
}): Promise<AdminFlightRevenueSummary | null> {
  const where: Prisma.BookingWhereInput = {
    type: "flight",
    created_at: { gte: input.from, lte: input.to },
    ...(input.status && ALLOWED_STATUS.has(input.status) ? { status: input.status } : {}),
    flightPaymentIntents: {
      some: {
        status: "succeeded",
        ...(input.currency ? { charge_currency: input.currency } : {}),
      },
    },
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      flightPaymentIntents: {
        where: {
          status: "succeeded",
          ...(input.currency ? { charge_currency: input.currency } : {}),
        },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  return buildSummaryFromBookings(bookings);
}

export async function getAdminFlightRevenueTimeSeries(
  from: Date,
  to: Date,
  granularity: "day" | "week",
): Promise<AdminFlightRevenueTimeSeriesPoint[]> {
  const trunc = pgTruncUnit(granularity);
  const rows = await prisma.$queryRaw<
    Array<{
      bucket: Date;
      customer_revenue: Prisma.Decimal | null;
      duffel_cost: Prisma.Decimal | null;
      commission: Prisma.Decimal | null;
      duffel_fee: Prisma.Decimal | null;
    }>
  >`
    SELECT
      date_trunc(${trunc}::text, b.created_at) AS bucket,
      SUM(CAST(p.charge_amount AS DECIMAL)) AS customer_revenue,
      SUM(
        CAST(p.offer_amount AS DECIMAL) + COALESCE(CAST(p.services_subtotal_amount AS DECIMAL), 0)
      ) AS duffel_cost,
      SUM(CAST(p.markup_amount AS DECIMAL)) AS commission,
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
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const points = rows.map((r) => ({
    date: formatBucketDate(r.bucket, granularity),
    customer_revenue: Number(r.customer_revenue ?? 0),
    duffel_cost: Number(r.duffel_cost ?? 0),
    commission: Number(r.commission ?? 0),
    duffel_fee: Number(r.duffel_fee ?? 0),
  }));

  return fillTimeSeriesGaps(
    points,
    from,
    to,
    granularity,
    ["customer_revenue", "duffel_cost", "commission", "duffel_fee"],
  ) as AdminFlightRevenueTimeSeriesPoint[];
}
