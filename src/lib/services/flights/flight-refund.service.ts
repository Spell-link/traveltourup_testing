import "server-only";

import { Prisma } from "@/generated/prisma";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { DuffelApiError } from "@/lib/duffel/errors";
import { createDuffelPaymentRefund, getDuffelPaymentRefund } from "@/lib/duffel/refunds";
import { prisma } from "@/lib/prisma";
import { sendFlightRefundEmail } from "@/lib/services/flights/flight-emails.service";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";

async function notifyRefundSuccess(input: {
  bookingId: string;
  refundId: string;
  amount: string;
  currency: string;
  partial: boolean;
}): Promise<void> {
  try {
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) return;
    await sendFlightRefundEmail({
      booking,
      refundId: input.refundId,
      amount: input.amount,
      currency: input.currency,
      partial: input.partial,
    });
  } catch {
    // best-effort email
  }
}

async function logRefundEvent(input: {
  type: BookingFinancialEventType;
  booking_id: string;
  flight_payment_intent_record_id?: string | null;
  amount?: string | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await bookingFinancialEventRepository.record({
      type: input.type,
      booking_id: input.booking_id,
      flight_payment_intent_record_id: input.flight_payment_intent_record_id ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort audit log
  }
}

function cardRefundPaymentLabel(
  bookingTotal: Prisma.Decimal,
  refundAmount: string | null,
): "refunded" | "partially_refunded" {
  if (refundAmount == null || refundAmount === "") return "partially_refunded";
  const r = Number.parseFloat(refundAmount);
  const t = Number.parseFloat(bookingTotal.toString());
  if (!Number.isFinite(r) || !Number.isFinite(t)) return "partially_refunded";
  if (r + 0.005 >= t) return "refunded";
  return "partially_refunded";
}

function computeRefundAmountForPit(input: {
  refundAmount: string | null;
  refundCurrency: string | null;
  chargeAmount: string;
  chargeCurrency: string;
}): { ok: true; amount: string; currency: string } | { ok: false; reason: string } {
  if (!input.refundCurrency || !input.chargeCurrency) {
    return { ok: false, reason: "MISSING_CURRENCY" };
  }
  if (input.refundCurrency.toUpperCase() !== input.chargeCurrency.toUpperCase()) {
    return { ok: false, reason: "CURRENCY_MISMATCH" };
  }
  const cur = input.chargeCurrency.toUpperCase();
  const r = Number.parseFloat(input.refundAmount ?? "");
  const c = Number.parseFloat(input.chargeAmount);
  if (!Number.isFinite(r) || !Number.isFinite(c) || c <= 0) {
    return { ok: false, reason: "INVALID_AMOUNTS" };
  }
  const amt = Math.min(Math.max(0, r), c);
  if (amt <= 0) return { ok: false, reason: "ZERO_REFUND" };
  return { ok: true, amount: amt.toFixed(2), currency: cur };
}

export type SettleFlightRefundResult =
  | { kind: "airline_credits_skipped" }
  | { kind: "already_recorded"; payment_status: string }
  | { kind: "settled"; payment_status: string; duffel_refund_id: string | null };

/**
 * After Duffel order cancellation is confirmed, return money via Duffel Payments when `refund_to` is
 * `original_form_of_payment` (or null/unknown — treat as card path when a payment intent exists).
 * Airline credits: caller should set `payment_status` to `credit_issued`; this function is a no-op.
 */
export async function settleDuffelFlightRefundAfterCancellation(input: {
  bookingId: string;
  flightOrderCancellationId: string;
  refundTo: string | null;
  refundAmount: string | null;
  refundCurrency: string | null;
  bookingTotalAmount: Prisma.Decimal;
}): Promise<SettleFlightRefundResult> {
  if (
    input.refundTo === "airline_credits" ||
    input.refundTo === "balance"
  ) {
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        payment_status:
          input.refundTo === "balance"
            ? "refunded"
            : "credit_issued",
      },
    });
  
    return {
      kind: "airline_credits_skipped",
    };
  }
  const existing = await prisma.flightPaymentRefundAttempt.findUnique({
    where: { flight_order_cancellation_id: input.flightOrderCancellationId },
  });
  if (existing?.status === "succeeded") {
    const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount);
    return { kind: "already_recorded", payment_status: pay };
  }
  if (existing?.status === "pending" && existing.duffel_refund_id) {
    return { kind: "already_recorded", payment_status: "refund_processing" };
  }
  if (existing?.status === "skipped") {
    const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount);
    return { kind: "already_recorded", payment_status: pay };
  }

  const pit = await flightPaymentIntentRepository.findFirstByBookingId(input.bookingId);
  if (!pit) {
    await prisma.flightPaymentRefundAttempt.upsert({
      where: { flight_order_cancellation_id: input.flightOrderCancellationId },
      create: {
        booking_id: input.bookingId,
        flight_order_cancellation_id: input.flightOrderCancellationId,
        flight_payment_intent_record_id: null,
        status: "failed",
        error_code: "NO_PAYMENT_INTENT",
      },
      update: {
        status: "failed",
        error_code: "NO_PAYMENT_INTENT",
        flight_payment_intent_record_id: null,
      },
    });
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: { payment_status: "refund_failed" },
    });
    return { kind: "settled", payment_status: "refund_failed", duffel_refund_id: null };
  }

  const computed = computeRefundAmountForPit({
    refundAmount: input.refundAmount,
    refundCurrency: input.refundCurrency,
    chargeAmount: pit.charge_amount,
    chargeCurrency: pit.charge_currency,
  });

  if (!computed.ok) {
    const err =
      computed.reason === "ZERO_REFUND"
        ? "ZERO_REFUND"
        : computed.reason === "CURRENCY_MISMATCH"
          ? "CURRENCY_MISMATCH"
          : "INVALID_REFUND_QUOTE";
    await prisma.flightPaymentRefundAttempt.upsert({
      where: { flight_order_cancellation_id: input.flightOrderCancellationId },
      create: {
        booking_id: input.bookingId,
        flight_order_cancellation_id: input.flightOrderCancellationId,
        flight_payment_intent_record_id: pit.id,
        status: computed.reason === "ZERO_REFUND" ? "skipped" : "failed",
        error_code: err,
        amount: input.refundAmount ?? undefined,
        currency: input.refundCurrency ?? undefined,
      },
      update: {
        status: computed.reason === "ZERO_REFUND" ? "skipped" : "failed",
        error_code: err,
        flight_payment_intent_record_id: pit.id,
        amount: input.refundAmount ?? undefined,
        currency: input.refundCurrency ?? undefined,
      },
    });
    const pay =
      computed.reason === "ZERO_REFUND"
        ? cardRefundPaymentLabel(input.bookingTotalAmount, "0")
        : "refund_failed";
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: { payment_status: pay },
    });
    return { kind: "settled", payment_status: pay, duffel_refund_id: null };
  }

  await prisma.flightPaymentRefundAttempt.upsert({
    where: { flight_order_cancellation_id: input.flightOrderCancellationId },
    create: {
      booking_id: input.bookingId,
      flight_order_cancellation_id: input.flightOrderCancellationId,
      flight_payment_intent_record_id: pit.id,
      status: "pending",
      amount: computed.amount,
      currency: computed.currency,
    },
    update: {
      status: "pending",
      flight_payment_intent_record_id: pit.id,
      amount: computed.amount,
      currency: computed.currency,
      error_code: null,
      duffel_refund_id: null,
      raw: Prisma.JsonNull,
    },
  });

  await logRefundEvent({
    type: "refund_initiated",
    booking_id: input.bookingId,
    flight_payment_intent_record_id: pit.id,
    amount: computed.amount,
    currency: computed.currency,
    payload: {
      duffel_intent_id: pit.duffel_intent_id,
      flight_order_cancellation_id: input.flightOrderCancellationId,
    },
  });

  try {
    const refund = await createDuffelPaymentRefund({
      payment_intent_id: pit.duffel_intent_id,
      amount: computed.amount,
      currency: computed.currency,
    });
    const st = (refund.status ?? "").toLowerCase();
    const terminal =
      st === "succeeded"
        ? cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount)
        : st === "pending"
          ? "refund_processing"
          : "refund_failed";

    await prisma.flightPaymentRefundAttempt.update({
      where: { flight_order_cancellation_id: input.flightOrderCancellationId },
      data: {
        duffel_refund_id: refund.id,
        status: st === "failed" ? "failed" : st === "pending" ? "pending" : "succeeded",
        raw: refund as unknown as Prisma.InputJsonValue,
        error_code: st === "failed" ? "DUFFEL_REFUND_FAILED" : null,
      },
    });
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: { payment_status: terminal },
    });

    if (terminal === "refunded" || terminal === "partially_refunded") {
      await logRefundEvent({
        type: "refund_succeeded",
        booking_id: input.bookingId,
        flight_payment_intent_record_id: pit.id,
        amount: computed.amount,
        currency: computed.currency,
        payload: { duffel_refund_id: refund.id, partial: terminal === "partially_refunded" },
      });
      await notifyRefundSuccess({
        bookingId: input.bookingId,
        refundId: refund.id,
        amount: computed.amount,
        currency: computed.currency,
        partial: terminal === "partially_refunded",
      });
    } else if (terminal === "refund_failed") {
      await logRefundEvent({
        type: "refund_failed",
        booking_id: input.bookingId,
        flight_payment_intent_record_id: pit.id,
        amount: computed.amount,
        currency: computed.currency,
        payload: { duffel_refund_id: refund.id, refund_status: st },
      });
    }

    return { kind: "settled", payment_status: terminal, duffel_refund_id: refund.id };
  } catch (e) {
    const code = e instanceof DuffelApiError ? e.firstDuffelErrorCode ?? "UPSTREAM_ERROR" : "REFUND_ERROR";
    await prisma.flightPaymentRefundAttempt.update({
      where: { flight_order_cancellation_id: input.flightOrderCancellationId },
      data: {
        status: "failed",
        error_code: code.slice(0, 120),
      },
    });
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: { payment_status: "refund_failed" },
    });
    await logRefundEvent({
      type: "refund_failed",
      booking_id: input.bookingId,
      flight_payment_intent_record_id: pit.id,
      amount: computed.amount,
      currency: computed.currency,
      payload: { error_code: code },
    });
    return { kind: "settled", payment_status: "refund_failed", duffel_refund_id: null };
  }
}

/**
 * Retry Duffel Payments refund after a failed attempt (same
 * `flight_order_cancellation_id`).
 *
 * If a previous attempt left a `pending` row with a `duffel_refund_id`, we
 * first poll Duffel `GET /payments/refunds/:id` to see if it has resolved.
 * This is cheaper than blindly creating a new refund and protects against
 * the case where Duffel's async pipeline has completed but our local row was
 * never updated (webhook missed / out of order).
 */
export async function retryDuffelFlightRefundForBooking(
  input: Parameters<typeof settleDuffelFlightRefundAfterCancellation>[0],
): Promise<SettleFlightRefundResult> {
  const existing = await prisma.flightPaymentRefundAttempt.findUnique({
    where: { flight_order_cancellation_id: input.flightOrderCancellationId },
  });

  if (existing?.status === "pending" && existing.duffel_refund_id) {
    try {
      const remote = await getDuffelPaymentRefund(existing.duffel_refund_id);
      const st = (remote.status ?? "").toLowerCase();
      if (st === "succeeded" || st === "completed") {
        const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount);
        await prisma.$transaction([
          prisma.flightPaymentRefundAttempt.update({
            where: { id: existing.id },
            data: {
              status: "succeeded",
              raw: remote as unknown as Prisma.InputJsonValue,
              error_code: null,
            },
          }),
          prisma.booking.update({
            where: { id: input.bookingId },
            data: { payment_status: pay },
          }),
        ]);
        await logRefundEvent({
          type: "refund_succeeded",
          booking_id: input.bookingId,
          flight_payment_intent_record_id: existing.flight_payment_intent_record_id,
          amount: existing.amount,
          currency: existing.currency,
          payload: {
            duffel_refund_id: existing.duffel_refund_id,
            poll_source: "retry.get-refund",
            partial: pay === "partially_refunded",
          },
        });
        if (existing.amount && existing.currency) {
          await notifyRefundSuccess({
            bookingId: input.bookingId,
            refundId: existing.duffel_refund_id,
            amount: existing.amount,
            currency: existing.currency,
            partial: pay === "partially_refunded",
          });
        }
        return {
          kind: "settled",
          payment_status: pay,
          duffel_refund_id: existing.duffel_refund_id,
        };
      }
      if (st === "failed" || st === "canceled") {
        await prisma.$transaction([
          prisma.flightPaymentRefundAttempt.update({
            where: { id: existing.id },
            data: {
              status: "failed",
              raw: remote as unknown as Prisma.InputJsonValue,
              error_code: "DUFFEL_REFUND_FAILED",
            },
          }),
          prisma.booking.update({
            where: { id: input.bookingId },
            data: { payment_status: "refund_failed" },
          }),
        ]);
        await logRefundEvent({
          type: "refund_failed",
          booking_id: input.bookingId,
          flight_payment_intent_record_id: existing.flight_payment_intent_record_id,
          amount: existing.amount,
          currency: existing.currency,
          payload: {
            duffel_refund_id: existing.duffel_refund_id,
            poll_source: "retry.get-refund",
            refund_status: st,
          },
        });
        return {
          kind: "settled",
          payment_status: "refund_failed",
          duffel_refund_id: existing.duffel_refund_id,
        };
      }
      // Still pending upstream — fall through and let the settlement re-run
      // (it will detect "already_recorded:pending" and report unchanged).
    } catch {
      // poll failed; fall through to settlement re-run
    }
  }

  return settleDuffelFlightRefundAfterCancellation(input);
}
