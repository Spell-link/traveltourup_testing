import "server-only";

import { Prisma } from "@/generated/prisma";
import { logger } from "@/lib/obs/logger";
import { prisma } from "@/lib/prisma";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { getDuffelPaymentRefund } from "@/lib/duffel/refunds";
import { DuffelApiError } from "@/lib/duffel/errors";

/**
 * Reconciliation jobs for the flight saga. Each handler is idempotent and
 * safe to invoke on a fixed schedule (Vercel / Supabase cron, etc.).
 */

const MIN_ORPHAN_PIT_AGE_MS = 10 * 60 * 1000;
const MAX_PIT_ROWS_PER_SWEEP = 50;
const MAX_REFUND_ROWS_PER_POLL = 50;
const MAX_CANCELLATION_ROWS_PER_SWEEP = 100;

export type OrphanPitSweepResult = {
  scanned: number;
  alerted: number;
  pit_ids: string[];
};

/**
 * Find Duffel PaymentIntents that succeeded but never produced a booking and
 * never recorded a terminal `order_failure_at`. These are payments we have
 * captured against the customer's card but for which we don't have an order
 * — they require human investigation (refund the customer manually or finish
 * the order if the underlying race is recoverable). The job records a
 * one-time `intent_failed` event row per orphan and emits a structured log
 * spike that should drive an alert.
 */
export async function sweepOrphanFlightPaymentIntents(
  options: { requestId?: string } = {},
): Promise<OrphanPitSweepResult> {
  const cutoff = new Date(Date.now() - MIN_ORPHAN_PIT_AGE_MS);
  const candidates = await prisma.flightPaymentIntentRecord.findMany({
    where: {
      status: "succeeded",
      booking_id: null,
      order_failure_at: null,
      updated_at: { lt: cutoff },
    },
    orderBy: { updated_at: "asc" },
    take: MAX_PIT_ROWS_PER_SWEEP,
  });

  const pitIds: string[] = [];
  let alerted = 0;
  for (const pit of candidates) {
    const already = await prisma.bookingFinancialEvent.findFirst({
      where: {
        flight_payment_intent_record_id: pit.id,
        type: "intent_failed",
      },
    });
    if (already) {
      pitIds.push(pit.duffel_intent_id);
      continue;
    }
    try {
      await bookingFinancialEventRepository.record({
        type: "intent_failed",
        flight_payment_intent_record_id: pit.id,
        amount: pit.charge_amount,
        currency: pit.charge_currency,
        request_id: options.requestId ?? null,
        payload: {
          reason: "orphan_succeeded_intent",
          duffel_intent_id: pit.duffel_intent_id,
          offer_id: pit.offer_id,
        } as Prisma.InputJsonValue,
      });
    } catch {
      // best-effort
    }
    logger.error("Flight payment intent orphan detected", {
      request_id: options.requestId ?? null,
      pit_id: pit.duffel_intent_id,
      error_code: "ORPHAN_PIT_SUCCEEDED",
    });
    alerted += 1;
    pitIds.push(pit.duffel_intent_id);
  }

  logger.info("Orphan PIT sweep complete", {
    request_id: options.requestId ?? null,
    scanned: candidates.length,
    alerted,
  });
  return { scanned: candidates.length, alerted, pit_ids: pitIds };
}

export type RefundPollResult = {
  scanned: number;
  succeeded: number;
  failed: number;
  pending: number;
};

/**
 * Walks pending Duffel refunds (those we created but Duffel returned `pending`
 * for) and resolves them via `GET /payments/refunds/:id`. On terminal status
 * the booking's `payment_status` lifts to `refunded`/`refund_failed`.
 */
export async function pollPendingFlightRefunds(
  options: { requestId?: string } = {},
): Promise<RefundPollResult> {
  const attempts = await prisma.flightPaymentRefundAttempt.findMany({
    where: {
      status: "pending",
      duffel_refund_id: { not: null },
    },
    orderBy: { updated_at: "asc" },
    take: MAX_REFUND_ROWS_PER_POLL,
    include: { booking: true },
  });

  let succeeded = 0;
  let failed = 0;
  let pending = 0;

  for (const attempt of attempts) {
    const refundId = attempt.duffel_refund_id;
    if (!refundId) continue;
    try {
      const refund = await getDuffelPaymentRefund(refundId);
      const st = (refund.status ?? "").toLowerCase();
      if (st === "succeeded" || st === "completed") {
        const refundedAmount = Number.parseFloat(attempt.amount ?? "0");
        const bookingTotal = Number.parseFloat(
          attempt.booking?.total_amount.toString() ?? "0",
        );
        const fully = bookingTotal > 0 && refundedAmount + 0.005 >= bookingTotal;
        const payStatus = fully ? "refunded" : "partially_refunded";
        await prisma.$transaction([
          prisma.flightPaymentRefundAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "succeeded",
              raw: refund as unknown as Prisma.InputJsonValue,
              error_code: null,
            },
          }),
          prisma.booking.update({
            where: { id: attempt.booking_id },
            data: { payment_status: payStatus },
          }),
        ]);
        try {
          await bookingFinancialEventRepository.record({
            type: "refund_succeeded",
            booking_id: attempt.booking_id,
            flight_payment_intent_record_id: attempt.flight_payment_intent_record_id,
            amount: attempt.amount,
            currency: attempt.currency,
            request_id: options.requestId ?? null,
            payload: {
              duffel_refund_id: refundId,
              partial: !fully,
              poll_source: "ops.poll-refunds",
            } as Prisma.InputJsonValue,
          });
        } catch {
          // ignore
        }
        succeeded += 1;
      } else if (st === "failed" || st === "canceled") {
        await prisma.$transaction([
          prisma.flightPaymentRefundAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "failed",
              raw: refund as unknown as Prisma.InputJsonValue,
              error_code: "DUFFEL_REFUND_FAILED",
            },
          }),
          prisma.booking.update({
            where: { id: attempt.booking_id },
            data: { payment_status: "refund_failed" },
          }),
        ]);
        try {
          await bookingFinancialEventRepository.record({
            type: "refund_failed",
            booking_id: attempt.booking_id,
            flight_payment_intent_record_id: attempt.flight_payment_intent_record_id,
            amount: attempt.amount,
            currency: attempt.currency,
            request_id: options.requestId ?? null,
            payload: {
              duffel_refund_id: refundId,
              poll_source: "ops.poll-refunds",
              refund_status: st,
            } as Prisma.InputJsonValue,
          });
        } catch {
          // ignore
        }
        failed += 1;
      } else {
        pending += 1;
      }
    } catch (e) {
      const code = e instanceof DuffelApiError ? e.firstDuffelErrorCode : undefined;
      logger.warn("Duffel refund poll error", {
        request_id: options.requestId ?? null,
        duffel_refund_id: refundId,
        error_code: code ?? "POLL_ERROR",
      });
      pending += 1;
    }
  }

  logger.info("Refund poll complete", {
    request_id: options.requestId ?? null,
    scanned: attempts.length,
    succeeded,
    failed,
    pending,
  });
  return { scanned: attempts.length, succeeded, failed, pending };
}

export type ExpireQuotesResult = {
  scanned: number;
  expired: number;
};

/**
 * Mark `FlightOrderCancellation` rows whose `quote_expires_at` is in the past
 * but are still `pending` as `expired`. The cancel route already handles
 * inline expiry on `confirm` — this is the safety net for quotes the user
 * never confirms.
 */
export async function expireStaleCancellationQuotes(
  options: { requestId?: string } = {},
): Promise<ExpireQuotesResult> {
  const now = new Date();
  const stale = await prisma.flightOrderCancellation.findMany({
    where: {
      status: "pending",
      quote_expires_at: { lt: now },
    },
    orderBy: { quote_expires_at: "asc" },
    take: MAX_CANCELLATION_ROWS_PER_SWEEP,
    select: { id: true },
  });

  if (stale.length === 0) {
    logger.info("Cancellation quote expiry sweep — nothing to do", {
      request_id: options.requestId ?? null,
    });
    return { scanned: 0, expired: 0 };
  }

  const result = await prisma.flightOrderCancellation.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: { status: "expired" },
  });
  logger.info("Cancellation quote expiry sweep complete", {
    request_id: options.requestId ?? null,
    scanned: stale.length,
    expired: result.count,
  });
  return { scanned: stale.length, expired: result.count };
}
