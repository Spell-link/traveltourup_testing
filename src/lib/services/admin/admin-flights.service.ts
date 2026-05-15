import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type AdminFlightBookingRow = {
  id: string;
  booking_ref_no: string;
  status: string;
  payment_status: string;
  total_amount: string;
  currency: string;
  duffel_order_id: string | null;
  airline_pnr: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminFlightBookingListResult = {
  items: AdminFlightBookingRow[];
  total: number;
  page: number;
  page_size: number;
};

const ALLOWED_STATUS = new Set(["pending", "confirmed", "cancelled", "failed"]);

export async function listAdminFlightBookings(query: {
  page?: number;
  page_size?: number;
  status?: string;
  q?: string;
}): Promise<AdminFlightBookingListResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.page_size ?? 25));
  const skip = (page - 1) * pageSize;

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
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
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
    page_size: pageSize,
  };
}

export type AdminFlightSagaDetail = {
  booking: AdminFlightBookingRow & {
    offer_id: string | null;
    live_mode: boolean | null;
    offer_expires_at: string | null;
  };
  payment_intents: Array<{
    id: string;
    duffel_intent_id: string;
    status: string;
    charge_amount: string;
    charge_currency: string;
    offer_amount: string;
    offer_currency: string;
    markup_amount: string;
    booking_id: string | null;
    order_failure_at: string | null;
    order_failure_code: string | null;
    order_failure_refund_id: string | null;
    order_failure_refund_status: string | null;
    created_at: string;
    updated_at: string;
  }>;
  cancellations: Array<{
    id: string;
    duffel_cancellation_id: string;
    duffel_order_id: string;
    status: string;
    refund_amount: string | null;
    refund_currency: string | null;
    refund_to: string | null;
    quote_expires_at: string | null;
    confirmed_at: string | null;
    created_at: string;
  }>;
  refund_attempts: Array<{
    id: string;
    duffel_refund_id: string | null;
    status: string;
    amount: string | null;
    currency: string | null;
    error_code: string | null;
    flight_payment_intent_record_id: string | null;
    flight_order_cancellation_id: string;
    created_at: string;
    updated_at: string;
  }>;
  financial_events: Array<{
    id: string;
    type: string;
    amount: string | null;
    currency: string | null;
    payload: unknown;
    created_at: string;
  }>;
};

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

export type AdminWebhookRow = {
  id: string;
  event_id: string;
  type: string;
  received_at: string;
  processed_at: string | null;
  error: string | null;
  payload: unknown;
};

export async function listAdminDuffelWebhooks(query: {
  page?: number;
  page_size?: number;
  type?: string;
}): Promise<{
  items: AdminWebhookRow[];
  total: number;
  page: number;
  page_size: number;
}> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, query.page_size ?? 25));
  const skip = (page - 1) * pageSize;
  const where: Prisma.DuffelWebhookEventWhereInput = query.type
    ? { type: { contains: query.type, mode: "insensitive" } }
    : {};
  const [rows, total] = await Promise.all([
    prisma.duffelWebhookEvent.findMany({
      where,
      orderBy: { received_at: "desc" },
      skip,
      take: pageSize,
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
    page_size: pageSize,
  };
}
