import "server-only";

import { Prisma } from "@/generated/prisma";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { getDuffelOrder } from "@/lib/duffel/orders";
import { staysGetBooking } from "@/lib/duffel/stays-http";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/obs/logger";
import { reconcileExternalOrderCancellation } from "@/lib/services/flights/flight-webhook-cancel.service";
import {
  applyCancellationRefundRemoteStatus,
  applyCompensationRefundRemoteStatus,
} from "@/lib/services/flights/flight-refund.service";
import { parseCancellationFromDuffelOrder } from "@/lib/services/flights/flight-order-cancellation-parse";
import { isCardRefundPath } from "@/lib/services/flights/flight-refund.core";

function getOrderObjectFromWebhookPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  const data = payload.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const obj = d.object;
  if (!obj || typeof obj !== "object") return null;
  return obj as Record<string, unknown>;
}

function unwrapDuffelOrderResponse(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

function isOrderCancelledInDuffelOrder(order: Record<string, unknown>): boolean {
  if (order.cancelled_at != null) return true;
  const cancel = order.cancellation;
  if (cancel && typeof cancel === "object") {
    const c = cancel as Record<string, unknown>;
    if (typeof c.confirmed_at === "string" && c.confirmed_at.length > 0) return true;
  }
  return false;
}

/** Re-fetch order when webhook payload is thin or cancellation refund fields are missing. */
function orderNeedsFreshFetch(order: Record<string, unknown>): boolean {
  if (typeof order.total_amount !== "string") return true;
  if (!isOrderCancelledInDuffelOrder(order)) return false;
  const parsed = parseCancellationFromDuffelOrder(order);
  if (!parsed?.confirmedAt) return true;
  if (isCardRefundPath(parsed.refundTo) && !parsed.refundAmount) return true;
  return false;
}

/**
 * Best-effort sync from Duffel webhook `order.*` events.
 * Idempotent at event level (`DuffelWebhookEvent.event_id` unique).
 */
function getStayBookingIdFromWebhookPayload(payload: Record<string, unknown>): string | null {
  const data = payload.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const obj = d.object;
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const id = o.id;
  return typeof id === "string" && id.startsWith("bok_") ? id : null;
}

function unwrapDuffelStaysBooking(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

function getEmbeddedObject(payload: Record<string, unknown>): Record<string, unknown> | null {
  const data = payload.data;
  if (!data || typeof data !== "object") return null;
  const obj = (data as Record<string, unknown>).object;
  if (!obj || typeof obj !== "object") return null;
  return obj as Record<string, unknown>;
}

/**
 * Reflect Duffel `payment_intent.*` events into the local PIT row + ledger so
 * status drift cannot accumulate. The booking saga remains authoritative for
 * happy-path captures (see `flights-booking.service.ts`); these handlers exist
 * for out-of-band updates (`canceled`, async `succeeded` confirmations, etc.).
 */
async function handlePaymentIntentWebhook(
  payload: Record<string, unknown>,
  type: string,
): Promise<void> {
  const obj = getEmbeddedObject(payload);
  if (!obj) return;
  const id = obj.id;
  if (typeof id !== "string" || !id.startsWith("pit_")) return;

  const status = typeof obj.status === "string" ? obj.status : null;
  const row = await flightPaymentIntentRepository.findByDuffelIntentId(id);
  if (!row) return;

  if (status && status !== row.status) {
    await flightPaymentIntentRepository.updateStatusByDuffelId(id, status);
  }

  const st = (status ?? "").toLowerCase();
  let eventType: "intent_succeeded" | "intent_failed" | null = null;
  if (st === "succeeded") eventType = "intent_succeeded";
  else if (st === "failed" || st === "canceled") eventType = "intent_failed";

  if (eventType) {
    try {
      const already = await prisma.bookingFinancialEvent.findFirst({
        where: {
          flight_payment_intent_record_id: row.id,
          type: eventType,
          payload: { path: ["webhook_event_type"], equals: type },
        },
      });
      if (!already) {
        await bookingFinancialEventRepository.record({
          type: eventType,
          flight_payment_intent_record_id: row.id,
          booking_id: row.booking_id,
          amount: row.charge_amount,
          currency: row.charge_currency,
          payload: {
            webhook_event_type: type,
            duffel_intent_id: id,
            status,
          } as Prisma.InputJsonValue,
        });
      }
    } catch {
      // best-effort
    }
  }

  logger.info("Duffel payment_intent webhook applied", {
    pit_id: id,
    error_code: status ?? "unknown",
  });
}

/**
 * Reflect Duffel `refunds.*` (or top-level `refund.*` — Duffel uses
 * `payment.refund.*`) into the local refund attempt row + ledger.
 */
async function handleRefundWebhook(
  payload: Record<string, unknown>,
  type: string,
): Promise<void> {
  const obj = getEmbeddedObject(payload);
  if (!obj) return;
  const id = obj.id;
  if (typeof id !== "string" || !id.startsWith("ref_")) return;

  const attempt = await prisma.flightPaymentRefundAttempt.findUnique({
    where: { duffel_refund_id: id },
    include: { booking: true },
  });

  const remote = {
    ...obj,
    id,
    status: typeof obj.status === "string" ? obj.status : undefined,
    amount: typeof obj.amount === "string" ? obj.amount : undefined,
    currency: typeof obj.currency === "string" ? obj.currency : undefined,
    payment_intent_id:
      typeof obj.payment_intent_id === "string" ? obj.payment_intent_id : undefined,
  } as import("@/lib/duffel/refunds").DuffelRefundResource;

  if (!attempt) {
    const pit = await prisma.flightPaymentIntentRecord.findFirst({
      where: { order_failure_refund_id: id },
    });
    if (pit) {
      await applyCompensationRefundRemoteStatus({
        pit,
        remote,
        source: { webhook_event_type: type },
      });
      logger.info("Duffel compensation refund webhook applied", {
        duffel_refund_id: id,
        pit_id: pit.duffel_intent_id,
      });
    }
    return;
  }

  if (!attempt.booking) return;

  const oc = await prisma.flightOrderCancellation.findUnique({
    where: { id: attempt.flight_order_cancellation_id },
  });

  await applyCancellationRefundRemoteStatus({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      booking_id: attempt.booking_id,
      flight_order_cancellation_id: attempt.flight_order_cancellation_id,
      flight_payment_intent_record_id: attempt.flight_payment_intent_record_id,
      amount: attempt.amount,
      currency: attempt.currency,
      duffel_refund_id: attempt.duffel_refund_id,
    },
    bookingTotalAmount: attempt.booking.total_amount,
    refundAmountQuoted: oc?.refund_amount ?? attempt.amount,
    remote,
    source: { webhook_event_type: type },
  });

  logger.info("Duffel refund webhook applied", {
    duffel_refund_id: id,
    booking_id: attempt.booking_id,
  });
}

/**
 * Persist an airline-initiated change / schedule change on the local
 * `FlightOrderChange` ledger so customer support, the saga inspector, and the
 * `change_quoted` financial event all light up. Voluntary user changes never
 * flow through this branch — they go through the `flight-order-change.service`.
 */
async function handleAirlineInitiatedOrderChange(
  payload: Record<string, unknown>,
  type: string,
): Promise<void> {
  const data = payload.data;
  if (!data || typeof data !== "object") return;
  const obj = (data as Record<string, unknown>).object;
  if (!obj || typeof obj !== "object") return;
  const o = obj as Record<string, unknown>;

  const orderId =
    typeof o.order_id === "string"
      ? o.order_id
      : typeof o.id === "string" && o.id.startsWith("ord_")
        ? o.id
        : null;
  if (!orderId) return;

  const fb = await bookingRepository.findFlightBookingRowByDuffelOrderId(orderId);
  if (!fb) return;

  const duffelChangeRequestId =
    typeof o.order_change_request_id === "string" ? o.order_change_request_id : null;
  const duffelChangeId =
    typeof o.id === "string" && o.id.startsWith("oc_") ? o.id : null;

  try {
    await prisma.flightOrderChange.create({
      data: {
        flight_booking_id: fb.id,
        source: "airline",
        duffel_order_change_request_id: duffelChangeRequestId,
        duffel_order_change_id: duffelChangeId,
        status: "quoted",
        raw: payload as unknown as Prisma.InputJsonValue,
      },
    });
    await bookingFinancialEventRepository.record({
      type: "change_quoted",
      booking_id: fb.booking_id,
      payload: {
        webhook_event_type: type,
        duffel_order_id: orderId,
        duffel_order_change_id: duffelChangeId,
      } as Prisma.InputJsonValue,
    });
  } catch (e) {
    logger.warn("Airline-initiated change persistence failed", {
      duffel_order_id: orderId,
      error_code: e instanceof Error ? e.message.slice(0, 120) : "PERSIST_ERROR",
    });
  }
}

export async function applyDuffelWebhookEventSideEffects(payload: Record<string, unknown>) {
  const type = payload.type;
  if (type === "ping.triggered") return;

  if (typeof type === "string") {
    if (type.startsWith("payment_intent.")) {
      return handlePaymentIntentWebhook(payload, type);
    }
    if (type.startsWith("refund.") || type.startsWith("refunds.")) {
      return handleRefundWebhook(payload, type);
    }
    if (
      type.startsWith("order.airline_initiated_change") ||
      type === "order.schedule_change" ||
      type.startsWith("order.schedule_change")
    ) {
      await handleAirlineInitiatedOrderChange(payload, type);
      // fall through to the generic `order.*` reconciliation below
    }
  }

  if (typeof type === "string" && type.startsWith("stays.")) {
    const bokId = getStayBookingIdFromWebhookPayload(payload);
    if (!bokId) {
      return;
    }

    const hb = await bookingRepository.findHotelBookingRowByDuffelBookingId(bokId);
    if (!hb) return;

    let bookingObj: Record<string, unknown> | null = null;
    const data = payload.data;
    if (data && typeof data === "object") {
      const obj = (data as Record<string, unknown>).object;
      if (obj && typeof obj === "object") {
        bookingObj = obj as Record<string, unknown>;
      }
    }

    if (!bookingObj || typeof bookingObj.status !== "string") {
      try {
        const fresh = await staysGetBooking(bokId);
        const un = unwrapDuffelStaysBooking(fresh);
        if (un) bookingObj = un;
      } catch {
        /* keep embedded only */
      }
    }

    if (bookingObj) {
      await prisma.hotelBooking.update({
        where: { id: hb.id },
        data: { stays_raw: bookingObj as unknown as Prisma.InputJsonValue },
      });
    }

    if (type === "stays.booking_creation_failed") {
      await prisma.booking.update({
        where: { id: hb.booking_id },
        data: { status: "failed", payment_status: "refund_pending" },
      });
      return;
    }

    const st = bookingObj && typeof bookingObj.status === "string" ? bookingObj.status : null;
    if (st === "cancelled") {
      await prisma.booking.update({
        where: { id: hb.booking_id },
        data: { status: "cancelled", payment_status: "refunded" },
      });
    }
    return;
  }

  if (typeof type !== "string" || !type.startsWith("order.")) return;

  const embedded = getOrderObjectFromWebhookPayload(payload);
  if (!embedded || typeof embedded.id !== "string" || !embedded.id.startsWith("ord_")) {
    return;
  }

  let order = embedded;
  if (orderNeedsFreshFetch(order)) {
    try {
      const fresh = await getDuffelOrder(embedded.id);
      const data = unwrapDuffelOrderResponse(fresh);
      if (data) order = data;
    } catch {
      /* use embedded only */
    }
  }

  const fb = await bookingRepository.findFlightBookingRowByDuffelOrderId(order.id as string);
  if (!fb) return;

  const bookingRef = order.booking_reference;
  await prisma.flightBooking.update({
    where: { id: fb.id },
    data: {
      order_raw: order as unknown as Prisma.InputJsonValue,
      ...(typeof bookingRef === "string" ? { booking_reference: bookingRef } : {}),
    },
  });

  if (isOrderCancelledInDuffelOrder(order)) {
    await reconcileExternalOrderCancellation({
      flightBookingRowId: fb.id,
      bookingId: fb.booking_id,
      duffelOrderId: order.id as string,
      order,
    });
  }
}
