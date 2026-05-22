import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type {
  AdminFlightBookingListResult,
  AdminFlightBookingRow,
  AdminFlightSagaDetail,
  AdminWebhookRow,
} from "@/lib/admin/admin-flights.types";
import { getAdminFlightBookingRevenueDetail } from "@/lib/services/admin/admin-flight-revenue.service";

export type {
  AdminFlightBookingListResult,
  AdminFlightBookingRow,
  AdminFlightSagaDetail,
  AdminWebhookRow,
} from "@/lib/admin/admin-flights.types";

const ALLOWED_STATUS = new Set(["pending", "confirmed", "cancelled", "failed"]);

const BOOKING_SORT_FIELDS = {
  created_at: "created_at",
  booking_ref_no: "booking_ref_no",
  status: "status",
} as const;

export async function listAdminFlightBookings(query: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  sort?: keyof typeof BOOKING_SORT_FIELDS;
  order?: "asc" | "desc";
}): Promise<AdminFlightBookingListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(10, query.limit ?? 25));
  const skip = (page - 1) * limit;
  const sortField = query.sort && query.sort in BOOKING_SORT_FIELDS ? query.sort : "created_at";
  const order = query.order === "asc" ? "asc" : "desc";

  const where: Prisma.BookingWhereInput = {
    type: "flight",
    ...(query.status && ALLOWED_STATUS.has(query.status)
      ? { status: query.status }
      : {}),
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

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
      include: {
        flightBooking: {
          select: {
            duffel_order_id: true,
            booking_reference: true,
          },
        },
        user: {
          select: { first_name: true, last_name: true },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      booking_ref_no: row.booking_ref_no,
      status: row.status,
      payment_status: row.payment_status,
      total_amount: row.total_amount.toString(),
      currency: row.currency,
      duffel_order_id: row.flightBooking?.duffel_order_id ?? null,
      airline_pnr: row.flightBooking?.booking_reference ?? null,
      user_id: row.user_id,
      user_name: row.user
        ? `${row.user.first_name} ${row.user.last_name}`.trim() || null
        : null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getAdminFlightSagaDetail(
  bookingId: string,
): Promise<AdminFlightSagaDetail | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      flightBooking: true,
      user: { select: { first_name: true, last_name: true } },
      flightPaymentIntents: { orderBy: { created_at: "asc" } },
      flightPaymentRefundAttempts: { orderBy: { created_at: "asc" } },
      financialEvents: { orderBy: { created_at: "asc" } },
    },
  });
  if (!booking || booking.type !== "flight") return null;

  const cancellations = booking.flightBooking
    ? await prisma.flightOrderCancellation.findMany({
        where: { flight_booking_id: booking.flightBooking.id },
        orderBy: { created_at: "asc" },
      })
    : [];

  const revenueDetail = await getAdminFlightBookingRevenueDetail(bookingId);

  return {
    booking: {
      id: booking.id,
      booking_ref_no: booking.booking_ref_no,
      status: booking.status,
      payment_status: booking.payment_status,
      total_amount: booking.total_amount.toString(),
      currency: booking.currency,
      duffel_order_id: booking.flightBooking?.duffel_order_id ?? null,
      airline_pnr: booking.flightBooking?.booking_reference ?? null,
      user_id: booking.user_id,
      user_name: booking.user
        ? `${booking.user.first_name} ${booking.user.last_name}`.trim() || null
        : null,
      created_at: booking.created_at.toISOString(),
      updated_at: booking.updated_at.toISOString(),
      offer_id: booking.flightBooking?.duffel_offer_id ?? null,
      live_mode: booking.flightBooking?.live_mode ?? null,
      offer_expires_at: booking.flightBooking?.offer_expires_at?.toISOString() ?? null,
    },
    payment_intents: booking.flightPaymentIntents.map((pit) => ({
      id: pit.id,
      duffel_intent_id: pit.duffel_intent_id,
      status: pit.status,
      charge_amount: pit.charge_amount,
      charge_currency: pit.charge_currency,
      offer_amount: pit.offer_amount,
      offer_currency: pit.offer_currency,
      markup_amount: pit.markup_amount,
      booking_id: pit.booking_id,
      order_failure_at: pit.order_failure_at?.toISOString() ?? null,
      order_failure_code: pit.order_failure_code,
      order_failure_refund_id: pit.order_failure_refund_id,
      order_failure_refund_status: pit.order_failure_refund_status,
      created_at: pit.created_at.toISOString(),
      updated_at: pit.updated_at.toISOString(),
    })),
    cancellations: cancellations.map((c) => ({
      id: c.id,
      duffel_cancellation_id: c.duffel_cancellation_id,
      duffel_order_id: c.duffel_order_id,
      status: c.status,
      refund_amount: c.refund_amount,
      refund_currency: c.refund_currency,
      refund_to: c.refund_to,
      quote_expires_at: c.quote_expires_at?.toISOString() ?? null,
      confirmed_at: c.confirmed_at?.toISOString() ?? null,
      created_at: c.created_at.toISOString(),
    })),
    refund_attempts: booking.flightPaymentRefundAttempts.map((r) => ({
      id: r.id,
      duffel_refund_id: r.duffel_refund_id,
      status: r.status,
      amount: r.amount,
      currency: r.currency,
      error_code: r.error_code,
      flight_payment_intent_record_id: r.flight_payment_intent_record_id,
      flight_order_cancellation_id: r.flight_order_cancellation_id,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    })),
    financial_events: booking.financialEvents.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      payload: e.payload,
      created_at: e.created_at.toISOString(),
    })),
    revenue: revenueDetail?.revenue ?? null,
    reconciliation: revenueDetail?.reconciliation ?? [],
    pit_revenue: revenueDetail?.pit ?? null,
  };
}

export type AdminOrphanPitRow = {
  id: string;
  duffel_intent_id: string;
  status: string;
  charge_amount: string;
  charge_currency: string;
  offer_id: string;
  order_failure_at: string | null;
  order_failure_code: string | null;
  order_failure_refund_id: string | null;
  order_failure_refund_status: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Two queues, both needing admin attention:
 *  - "orphan": Duffel PIT succeeded ≥10 min ago but never linked to a booking,
 *    and no terminal failure was recorded. These are payments captured against
 *    the customer's card with nothing booked.
 *  - "post_capture_failed": PIT succeeded → order failed → terminal failure
 *    recorded. Inspect `order_failure_refund_status` to know whether the
 *    compensating refund succeeded.
 */
export async function listAdminFlightOrphanPits(): Promise<{
  orphan: AdminOrphanPitRow[];
  post_capture_failed: AdminOrphanPitRow[];
}> {
  const orphanCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const [orphan, postCaptureFailed] = await Promise.all([
    prisma.flightPaymentIntentRecord.findMany({
      where: {
        status: "succeeded",
        booking_id: null,
        order_failure_at: null,
        updated_at: { lt: orphanCutoff },
      },
      orderBy: { updated_at: "asc" },
      take: 50,
    }),
    prisma.flightPaymentIntentRecord.findMany({
      where: { order_failure_at: { not: null } },
      orderBy: { order_failure_at: "desc" },
      take: 50,
    }),
  ]);

  const map = (pit: (typeof orphan)[number]): AdminOrphanPitRow => ({
    id: pit.id,
    duffel_intent_id: pit.duffel_intent_id,
    status: pit.status,
    charge_amount: pit.charge_amount,
    charge_currency: pit.charge_currency,
    offer_id: pit.offer_id,
    order_failure_at: pit.order_failure_at?.toISOString() ?? null,
    order_failure_code: pit.order_failure_code,
    order_failure_refund_id: pit.order_failure_refund_id,
    order_failure_refund_status: pit.order_failure_refund_status,
    booking_id: pit.booking_id,
    created_at: pit.created_at.toISOString(),
    updated_at: pit.updated_at.toISOString(),
  });

  return {
    orphan: orphan.map(map),
    post_capture_failed: postCaptureFailed.map(map),
  };
}

const WEBHOOK_SORT_FIELDS = {
  received_at: "received_at",
  type: "type",
} as const;

export async function listAdminDuffelWebhooks(query: {
  page?: number;
  limit?: number;
  type?: string;
  sort?: keyof typeof WEBHOOK_SORT_FIELDS;
  order?: "asc" | "desc";
}): Promise<{
  items: AdminWebhookRow[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(10, query.limit ?? 25));
  const skip = (page - 1) * limit;
  const sortField = query.sort && query.sort in WEBHOOK_SORT_FIELDS ? query.sort : "received_at";
  const order = query.order === "asc" ? "asc" : "desc";
  const where: Prisma.DuffelWebhookEventWhereInput = query.type
    ? { type: { contains: query.type, mode: "insensitive" } }
    : {};
  const [rows, total] = await Promise.all([
    prisma.duffelWebhookEvent.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    prisma.duffelWebhookEvent.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      event_id: r.event_id,
      type: r.type,
      received_at: r.received_at.toISOString(),
      processed_at: r.processed_at?.toISOString() ?? null,
      error: r.error,
      payload: r.payload,
    })),
    total,
    page,
    limit,
  };
}
