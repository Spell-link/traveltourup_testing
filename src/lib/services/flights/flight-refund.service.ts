import "server-only";

import { Prisma } from "@/generated/prisma";
import type { FlightPaymentIntentRecord } from "@/generated/prisma";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { DuffelApiError } from "@/lib/duffel/errors";
import type { DuffelRefundResource } from "@/lib/duffel/refunds";
import { createDuffelPaymentRefund, getDuffelPaymentRefund } from "@/lib/duffel/refunds";
import { prisma } from "@/lib/prisma";
import { sendFlightBookingFailureRefundEmailSafe } from "@/lib/email/flight-booking-failure-refund.email";
import { sendFlightRefundEmail } from "@/lib/services/flights/flight-emails.service";
import {
  cardRefundPaymentLabel,
  compensationTerminalCodeFromRefundStatus,
  computeRefundAmountForPit,
  isCardRefundPath,
  isDuffelRefundFailed,
  isDuffelRefundPending,
  isDuffelRefundSucceeded,
  isNonCardRefundTo,
} from "@/lib/services/flights/flight-refund.core";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";

export {
  cardRefundPaymentLabel,
  computeRefundAmountForPit,
  isCardRefundPath,
} from "@/lib/services/flights/flight-refund.core";

async function logRefundEvent(input: {
  type: BookingFinancialEventType;
  booking_id?: string | null;
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

async function refundSuccessEmailAlreadySent(
  bookingId: string,
  duffelRefundId: string,
): Promise<boolean> {
  const existing = await prisma.bookingFinancialEvent.findFirst({
    where: {
      booking_id: bookingId,
      type: "refund_succeeded",
      payload: { path: ["duffel_refund_id"], equals: duffelRefundId },
    },
  });
  return Boolean(existing);
}

async function notifyRefundSuccess(input: {
  bookingId: string;
  refundId: string;
  amount: string;
  currency: string;
  partial: boolean;
}): Promise<void> {
  if (await refundSuccessEmailAlreadySent(input.bookingId, input.refundId)) return;
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

export type FinalizeCancellationRefundInput = {
  attemptId: string;
  bookingId: string;
  flightOrderCancellationId: string;
  flightPaymentIntentRecordId: string | null;
  bookingTotalAmount: Prisma.Decimal;
  refundAmountQuoted: string | null;
  amount: string;
  currency: string;
  duffelRefundId: string;
  raw: unknown;
  source?: Record<string, unknown>;
};

/**
 * Terminal success: update attempt + booking, ledger, refund email (idempotent).
 */
export async function finalizeCancellationRefundSuccess(
  input: FinalizeCancellationRefundInput,
): Promise<{ payment_status: "refunded" | "partially_refunded" }> {
  const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmountQuoted);
  await prisma.$transaction([
    prisma.flightPaymentRefundAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "succeeded",
        duffel_refund_id: input.duffelRefundId,
        raw: input.raw as Prisma.InputJsonValue,
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
    flight_payment_intent_record_id: input.flightPaymentIntentRecordId,
    amount: input.amount,
    currency: input.currency,
    payload: {
      duffel_refund_id: input.duffelRefundId,
      partial: pay === "partially_refunded",
      flight_order_cancellation_id: input.flightOrderCancellationId,
      card_refund_amount: input.amount,
      card_refund_currency: input.currency,
      ...input.source,
    },
  });

  await notifyRefundSuccess({
    bookingId: input.bookingId,
    refundId: input.duffelRefundId,
    amount: input.amount,
    currency: input.currency,
    partial: pay === "partially_refunded",
  });

  return { payment_status: pay };
}

export async function finalizeCancellationRefundFailed(input: {
  attemptId: string;
  bookingId: string;
  flightPaymentIntentRecordId: string | null;
  amount: string | null;
  currency: string | null;
  duffelRefundId: string | null;
  raw?: unknown;
  errorCode?: string;
  source?: Record<string, unknown>;
}): Promise<{ payment_status: "refund_failed" }> {
  await prisma.$transaction([
    prisma.flightPaymentRefundAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "failed",
        duffel_refund_id: input.duffelRefundId,
        raw: input.raw != null ? (input.raw as Prisma.InputJsonValue) : undefined,
        error_code: input.errorCode ?? "DUFFEL_REFUND_FAILED",
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
    flight_payment_intent_record_id: input.flightPaymentIntentRecordId,
    amount: input.amount,
    currency: input.currency,
    payload: {
      duffel_refund_id: input.duffelRefundId,
      ...input.source,
    },
  });

  return { payment_status: "refund_failed" };
}

/**
 * Apply Duffel refund resource status to a cancellation refund attempt row.
 */
export async function applyCancellationRefundRemoteStatus(input: {
  attempt: {
    id: string;
    status?: string;
    booking_id: string;
    flight_order_cancellation_id: string;
    flight_payment_intent_record_id: string | null;
    amount: string | null;
    currency: string | null;
    duffel_refund_id: string | null;
  };
  bookingTotalAmount: Prisma.Decimal;
  refundAmountQuoted: string | null;
  remote: DuffelRefundResource;
  source?: Record<string, unknown>;
}): Promise<"succeeded" | "failed" | "pending" | "unchanged"> {
  const refundId = input.remote.id ?? input.attempt.duffel_refund_id;
  if (!refundId) return "unchanged";

  const amount = input.attempt.amount ?? input.remote.amount;
  const currency = input.attempt.currency ?? input.remote.currency;

  if (isDuffelRefundSucceeded(input.remote.status)) {
    if (input.attempt.status === "succeeded") return "unchanged";
    await finalizeCancellationRefundSuccess({
      attemptId: input.attempt.id,
      bookingId: input.attempt.booking_id,
      flightOrderCancellationId: input.attempt.flight_order_cancellation_id,
      flightPaymentIntentRecordId: input.attempt.flight_payment_intent_record_id,
      bookingTotalAmount: input.bookingTotalAmount,
      refundAmountQuoted: input.refundAmountQuoted,
      amount,
      currency,
      duffelRefundId: refundId,
      raw: input.remote,
      source: input.source,
    });
    return "succeeded";
  }

  if (isDuffelRefundFailed(input.remote.status)) {
    if (input.attempt.status === "failed") return "unchanged";
    await finalizeCancellationRefundFailed({
      attemptId: input.attempt.id,
      bookingId: input.attempt.booking_id,
      flightPaymentIntentRecordId: input.attempt.flight_payment_intent_record_id,
      amount,
      currency,
      duffelRefundId: refundId,
      raw: input.remote,
      source: input.source,
    });
    return "failed";
  }

  if (isDuffelRefundPending(input.remote.status)) {
    await prisma.$transaction([
      prisma.flightPaymentRefundAttempt.update({
        where: { id: input.attempt.id },
        data: {
          status: "pending",
          duffel_refund_id: refundId,
          raw: input.remote as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.booking.update({
        where: { id: input.attempt.booking_id },
        data: { payment_status: "refund_processing" },
      }),
    ]);
    return "pending";
  }

  return "unchanged";
}

export type SettleFlightRefundResult =
  | { kind: "airline_credits_skipped" }
  | { kind: "already_recorded"; payment_status: string }
  | { kind: "settled"; payment_status: string; duffel_refund_id: string | null };

export async function settleDuffelFlightRefundAfterCancellation(input: {
  bookingId: string;
  flightOrderCancellationId: string;
  refundTo: string | null;
  refundAmount: string | null;
  refundCurrency: string | null;
  bookingTotalAmount: Prisma.Decimal;
}): Promise<SettleFlightRefundResult> {
  if (isNonCardRefundTo(input.refundTo)) {
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        payment_status: input.refundTo === "balance" ? "refunded" : "credit_issued",
      },
    });
    return { kind: "airline_credits_skipped" };
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

  const attempt = await prisma.flightPaymentRefundAttempt.upsert({
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

    const outcome = await applyCancellationRefundRemoteStatus({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        booking_id: input.bookingId,
        flight_order_cancellation_id: input.flightOrderCancellationId,
        flight_payment_intent_record_id: pit.id,
        amount: computed.amount,
        currency: computed.currency,
        duffel_refund_id: refund.id,
      },
      bookingTotalAmount: input.bookingTotalAmount,
      refundAmountQuoted: input.refundAmount,
      remote: refund,
      source: { settle: "create-refund" },
    });

    if (outcome === "succeeded") {
      const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount);
      return { kind: "settled", payment_status: pay, duffel_refund_id: refund.id };
    }
    if (outcome === "failed") {
      return { kind: "settled", payment_status: "refund_failed", duffel_refund_id: refund.id };
    }
    return { kind: "settled", payment_status: "refund_processing", duffel_refund_id: refund.id };
  } catch (e) {
    const code = e instanceof DuffelApiError ? e.firstDuffelErrorCode ?? "UPSTREAM_ERROR" : "REFUND_ERROR";
    await finalizeCancellationRefundFailed({
      attemptId: attempt.id,
      bookingId: input.bookingId,
      flightPaymentIntentRecordId: pit.id,
      amount: computed.amount,
      currency: computed.currency,
      duffelRefundId: null,
      errorCode: code.slice(0, 120),
      source: { error: code },
    });
    return { kind: "settled", payment_status: "refund_failed", duffel_refund_id: null };
  }
}

export async function retryDuffelFlightRefundForBooking(
  input: Parameters<typeof settleDuffelFlightRefundAfterCancellation>[0] & {
    adminRetry?: boolean;
  },
): Promise<SettleFlightRefundResult> {
  const existing = await prisma.flightPaymentRefundAttempt.findUnique({
    where: { flight_order_cancellation_id: input.flightOrderCancellationId },
  });

  if (existing?.status === "pending" && existing.duffel_refund_id) {
    try {
      const remote = await getDuffelPaymentRefund(existing.duffel_refund_id);
      const outcome = await applyCancellationRefundRemoteStatus({
        attempt: {
          id: existing.id,
          status: existing.status,
          booking_id: input.bookingId,
          flight_order_cancellation_id: input.flightOrderCancellationId,
          flight_payment_intent_record_id: existing.flight_payment_intent_record_id,
          amount: existing.amount,
          currency: existing.currency,
          duffel_refund_id: existing.duffel_refund_id,
        },
        bookingTotalAmount: input.bookingTotalAmount,
        refundAmountQuoted: input.refundAmount,
        remote,
        source: {
          poll_source: "retry.get-refund",
          admin_retry: input.adminRetry ?? false,
        },
      });
      if (outcome === "succeeded") {
        const pay = cardRefundPaymentLabel(input.bookingTotalAmount, input.refundAmount);
        return { kind: "settled", payment_status: pay, duffel_refund_id: existing.duffel_refund_id };
      }
      if (outcome === "failed") {
        return {
          kind: "settled",
          payment_status: "refund_failed",
          duffel_refund_id: existing.duffel_refund_id,
        };
      }
      if (outcome === "pending") {
        return { kind: "already_recorded", payment_status: "refund_processing" };
      }
    } catch {
      // poll failed; fall through to settlement re-run
    }
  }

  if (input.adminRetry && existing?.status === "failed") {
    await prisma.flightPaymentRefundAttempt.delete({
      where: { id: existing.id },
    }).catch(() => undefined);
  }

  return settleDuffelFlightRefundAfterCancellation(input);
}

export type CompensationRefundResult = {
  terminal_code: string;
  refund_id: string | null;
  refund_status: string | null;
};

async function recordCompensationRefundOnPit(input: {
  pit: FlightPaymentIntentRecord;
  terminalCode: string;
  refundId: string | null;
  refundStatus: string | null;
  bookingIdempotencyKey?: string | null;
  adminRetry?: boolean;
}): Promise<void> {
  await flightPaymentIntentRepository.recordTerminalOrderFailure({
    duffel_intent_id: input.pit.duffel_intent_id,
    order_failure_booking_idempotency_key:
      input.bookingIdempotencyKey ?? input.pit.order_failure_booking_idempotency_key,
    order_failure_code: input.terminalCode,
    order_failure_refund_id: input.refundId,
    order_failure_refund_status: input.refundStatus,
  });

  if (input.refundId) {
    await logRefundEvent({
      type: "refund_initiated",
      booking_id: input.pit.booking_id,
      flight_payment_intent_record_id: input.pit.id,
      amount: input.pit.charge_amount,
      currency: input.pit.charge_currency,
      payload: {
        duffel_refund_id: input.refundId,
        refund_status: input.refundStatus,
        duffel_intent_id: input.pit.duffel_intent_id,
        compensation: true,
        admin_retry: input.adminRetry ?? false,
      },
    });
    if (input.terminalCode === "BOOKING_FAILED_REFUNDED" || input.terminalCode === "ORPHAN_PIT_AUTO_REFUNDED") {
      await logRefundEvent({
        type: "refund_succeeded",
        booking_id: input.pit.booking_id,
        flight_payment_intent_record_id: input.pit.id,
        amount: input.pit.charge_amount,
        currency: input.pit.charge_currency,
        payload: {
          duffel_refund_id: input.refundId,
          compensation: true,
          admin_retry: input.adminRetry ?? false,
        },
      });
    }
  } else {
    await logRefundEvent({
      type: "refund_failed",
      booking_id: input.pit.booking_id,
      flight_payment_intent_record_id: input.pit.id,
      amount: input.pit.charge_amount,
      currency: input.pit.charge_currency,
      payload: {
        duffel_intent_id: input.pit.duffel_intent_id,
        compensation: true,
        admin_retry: input.adminRetry ?? false,
      },
    });
  }
}

/**
 * Issue or retry a full PIT compensation refund (booking failed after capture, orphan PIT).
 */
export async function retryCompensationRefundForPit(input: {
  duffelIntentId: string;
  adminRetry?: boolean;
  terminalCodeOverride?: "ORPHAN_PIT_AUTO_REFUNDED";
  bookingIdempotencyKey?: string | null;
}): Promise<CompensationRefundResult> {
  const pit = await flightPaymentIntentRepository.findByDuffelIntentId(input.duffelIntentId);
  if (!pit) {
    throw new Error("Payment intent not found");
  }

  if (pit.order_failure_refund_id && isDuffelRefundPending(pit.order_failure_refund_status)) {
    try {
      const remote = await getDuffelPaymentRefund(pit.order_failure_refund_id);
      const terminalCode = compensationTerminalCodeFromRefundStatus(remote.status ?? null);
      if (input.terminalCodeOverride && isDuffelRefundSucceeded(remote.status)) {
        await recordCompensationRefundOnPit({
          pit,
          terminalCode: input.terminalCodeOverride,
          refundId: remote.id,
          refundStatus: remote.status ?? null,
          adminRetry: input.adminRetry,
        });
        return {
          terminal_code: input.terminalCodeOverride,
          refund_id: remote.id,
          refund_status: remote.status ?? null,
        };
      }
      await recordCompensationRefundOnPit({
        pit,
        terminalCode,
        refundId: remote.id,
        refundStatus: remote.status ?? null,
        adminRetry: input.adminRetry,
      });
      return {
        terminal_code: terminalCode,
        refund_id: remote.id,
        refund_status: remote.status ?? null,
      };
    } catch {
      // fall through to create new refund if failed terminal
    }
  }

  if (
    pit.order_failure_code === "BOOKING_FAILED_REFUNDED" ||
    pit.order_failure_code === "ORPHAN_PIT_AUTO_REFUNDED" ||
    isDuffelRefundSucceeded(pit.order_failure_refund_status)
  ) {
    return {
      terminal_code: pit.order_failure_code ?? "BOOKING_FAILED_REFUNDED",
      refund_id: pit.order_failure_refund_id,
      refund_status: pit.order_failure_refund_status,
    };
  }

  let refundId: string | null = null;
  let refundStatus: string | null = null;
  let terminalCode: CompensationRefundResult["terminal_code"] = "BOOKING_FAILED_AFTER_PAYMENT";

  try {
    const refund = await createDuffelPaymentRefund({
      payment_intent_id: pit.duffel_intent_id,
      amount: pit.charge_amount,
      currency: pit.charge_currency,
    });
    refundId = refund.id;
    refundStatus = refund.status ?? "pending";
    terminalCode =
      input.terminalCodeOverride && isDuffelRefundSucceeded(refundStatus)
        ? input.terminalCodeOverride
        : compensationTerminalCodeFromRefundStatus(refundStatus);
  } catch (e) {
    if (e instanceof DuffelApiError && e.hasDuffelErrorCode("unavailable_feature")) {
      console.warn(
        "[refund] Duffel automatic refunds API unavailable for this account; manual refund required.",
        { pit_id: pit.duffel_intent_id },
      );
    } else {
      console.error("[refund] Compensation refund create failed:", e);
    }
    terminalCode = "BOOKING_FAILED_AFTER_PAYMENT";
  }

  await recordCompensationRefundOnPit({
    pit,
    terminalCode,
    refundId,
    refundStatus,
    bookingIdempotencyKey: input.bookingIdempotencyKey,
    adminRetry: input.adminRetry,
  });

  return { terminal_code: terminalCode, refund_id: refundId, refund_status: refundStatus };
}

/** Apply remote Duffel refund status to a PIT compensation row. */
export async function applyCompensationRefundRemoteStatus(input: {
  pit: FlightPaymentIntentRecord;
  remote: DuffelRefundResource;
  source?: Record<string, unknown>;
}): Promise<"succeeded" | "failed" | "pending" | "unchanged"> {
  const terminalCode = compensationTerminalCodeFromRefundStatus(input.remote.status ?? null);
  const existingCode = input.pit.order_failure_code ?? "";

  if (isDuffelRefundSucceeded(input.remote.status)) {
    if (
      isDuffelRefundSucceeded(input.pit.order_failure_refund_status) &&
      input.pit.order_failure_refund_id === input.remote.id
    ) {
      return "unchanged";
    }
    const code =
      existingCode === "ORPHAN_PIT_AUTO_REFUNDED"
        ? "ORPHAN_PIT_AUTO_REFUNDED"
        : terminalCode;
    await recordCompensationRefundOnPit({
      pit: input.pit,
      terminalCode: code,
      refundId: input.remote.id,
      refundStatus: input.remote.status ?? null,
    });
    return "succeeded";
  }

  if (isDuffelRefundFailed(input.remote.status)) {
    await recordCompensationRefundOnPit({
      pit: input.pit,
      terminalCode: "BOOKING_FAILED_AFTER_PAYMENT",
      refundId: input.remote.id,
      refundStatus: input.remote.status ?? null,
    });
    return "failed";
  }

  if (isDuffelRefundPending(input.remote.status)) {
    await flightPaymentIntentRepository.recordTerminalOrderFailure({
      duffel_intent_id: input.pit.duffel_intent_id,
      order_failure_booking_idempotency_key: input.pit.order_failure_booking_idempotency_key,
      order_failure_code: "BOOKING_FAILED_REFUND_PENDING",
      order_failure_refund_id: input.remote.id,
      order_failure_refund_status: input.remote.status ?? "pending",
    });
    return "pending";
  }

  return "unchanged";
}

export async function runCompensationRefundForPitFailure(input: {
  pit: FlightPaymentIntentRecord;
  bookingIdempotencyKey: string | null;
  passengers?: Parameters<typeof sendFlightBookingFailureRefundEmailSafe>[0]["passengers"];
  contactEmail?: string | null;
}): Promise<CompensationRefundResult> {
  const result = await retryCompensationRefundForPit({
    duffelIntentId: input.pit.duffel_intent_id,
    bookingIdempotencyKey: input.bookingIdempotencyKey,
  });

  await logRefundEvent({
    type: "order_failed",
    flight_payment_intent_record_id: input.pit.id,
    booking_id: input.pit.booking_id,
    amount: input.pit.charge_amount,
    currency: input.pit.charge_currency,
    payload: {
      duffel_intent_id: input.pit.duffel_intent_id,
      terminal_code: result.terminal_code,
    },
  });

  const terminalCode = result.terminal_code as
    | "BOOKING_FAILED_REFUNDED"
    | "BOOKING_FAILED_REFUND_PENDING"
    | "BOOKING_FAILED_AFTER_PAYMENT";

  await sendFlightBookingFailureRefundEmailSafe({
    passengers: input.passengers,
    contactEmail: input.contactEmail,
    pitId: input.pit.duffel_intent_id,
    chargeAmount: input.pit.charge_amount,
    chargeCurrency: input.pit.charge_currency,
    refundId: result.refund_id,
    refundStatus: result.refund_status,
    terminalCode:
      terminalCode === "BOOKING_FAILED_REFUNDED" ||
      terminalCode === "BOOKING_FAILED_REFUND_PENDING" ||
      terminalCode === "BOOKING_FAILED_AFTER_PAYMENT"
        ? terminalCode
        : "BOOKING_FAILED_AFTER_PAYMENT",
  });

  return result;
}
