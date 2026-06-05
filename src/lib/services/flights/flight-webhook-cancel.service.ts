import "server-only";

import { Prisma } from "@/generated/prisma";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { prisma } from "@/lib/prisma";
import { sendFlightCancellationEmail } from "@/lib/services/flights/flight-emails.service";
import { parseCancellationFromDuffelOrder } from "@/lib/services/flights/flight-order-cancellation-parse";
import {
  isCardRefundPath,
  isNonCardRefundTo,
} from "@/lib/services/flights/flight-refund.core";
import { settleDuffelFlightRefundAfterCancellation } from "@/lib/services/flights/flight-refund.service";
import { trackBookingCancelledJourney } from "@/lib/services/journey/booking-lifecycle-journey.service";

const TERMINAL_PAYMENT_STATUSES = new Set([
  "refunded",
  "partially_refunded",
  "credit_issued",
  "refund_failed",
]);

function paymentStatusForExternalCancel(refundTo: string | null): string {
  if (refundTo === "airline_credits") return "credit_issued";
  if (refundTo === "balance") return "refunded";
  return "refund_processing";
}

/**
 * When Duffel marks an order cancelled out-of-band (webhook / dashboard), sync local
 * cancellation row and initiate customer card refund when applicable.
 */
export async function reconcileExternalOrderCancellation(input: {
  flightBookingRowId: string;
  bookingId: string;
  duffelOrderId: string;
  order: Record<string, unknown>;
}): Promise<void> {
  const parsed = parseCancellationFromDuffelOrder(input.order);
  if (!parsed?.confirmedAt) return;

  const bookingRow = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { status: true, payment_status: true, total_amount: true },
  });
  if (!bookingRow) return;

  const wasAlreadyCancelled = bookingRow.status === "cancelled";

  let cancellationRow = parsed.duffelCancellationId
    ? await prisma.flightOrderCancellation.findFirst({
        where: {
          duffel_cancellation_id: parsed.duffelCancellationId,
          flight_booking_id: input.flightBookingRowId,
        },
      })
    : null;

  if (!cancellationRow) {
    cancellationRow = await prisma.flightOrderCancellation.create({
      data: {
        flight_booking_id: input.flightBookingRowId,
        duffel_cancellation_id:
          parsed.duffelCancellationId ??
          `external_${input.duffelOrderId}_${parsed.confirmedAt.getTime()}`,
        duffel_order_id: input.duffelOrderId,
        status: "confirmed",
        refund_amount: parsed.refundAmount,
        refund_currency: parsed.refundCurrency,
        refund_to: parsed.refundTo,
        quote_expires_at: parsed.quoteExpiresAt,
        confirmed_at: parsed.confirmedAt,
        raw: input.order as unknown as Prisma.InputJsonValue,
      },
    });
  } else if (cancellationRow.status !== "confirmed") {
    cancellationRow = await prisma.flightOrderCancellation.update({
      where: { id: cancellationRow.id },
      data: {
        status: "confirmed",
        refund_amount: parsed.refundAmount ?? cancellationRow.refund_amount,
        refund_currency: parsed.refundCurrency ?? cancellationRow.refund_currency,
        refund_to: parsed.refundTo ?? cancellationRow.refund_to,
        confirmed_at: parsed.confirmedAt,
      },
    });
  }

  const keepPaymentStatus =
    bookingRow.payment_status != null &&
    TERMINAL_PAYMENT_STATUSES.has(bookingRow.payment_status);

  const payStatus = keepPaymentStatus
    ? bookingRow.payment_status!
    : paymentStatusForExternalCancel(parsed.refundTo);

  await prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      status: "cancelled",
      ...(keepPaymentStatus ? {} : { payment_status: payStatus }),
    },
  });

  if (!wasAlreadyCancelled) {
    trackBookingCancelledJourney({
      bookingId: input.bookingId,
      properties: {
        source: "duffel_webhook",
        duffel_order_id: input.duffelOrderId,
        refund_amount: parsed.refundAmount,
        refund_currency: parsed.refundCurrency,
        refund_to: parsed.refundTo,
      },
    });

    try {
      const fullBooking = await bookingRepository.findById(input.bookingId);
      if (fullBooking) {
        await sendFlightCancellationEmail({
          booking: fullBooking,
          refundAmount: parsed.refundAmount,
          refundCurrency: parsed.refundCurrency,
          refundTo: parsed.refundTo,
        });
      }
    } catch {
      // best-effort
    }
  }

  if (
    isNonCardRefundTo(parsed.refundTo) ||
    (keepPaymentStatus && bookingRow.payment_status !== "refund_processing")
  ) {
    return;
  }

  if (!isCardRefundPath(parsed.refundTo)) {
    return;
  }

  const existingAttempt = await prisma.flightPaymentRefundAttempt.findUnique({
    where: { flight_order_cancellation_id: cancellationRow.id },
  });
  if (existingAttempt?.status === "succeeded" || existingAttempt?.status === "pending") {
    return;
  }

  await settleDuffelFlightRefundAfterCancellation({
    bookingId: input.bookingId,
    flightOrderCancellationId: cancellationRow.id,
    refundTo: parsed.refundTo,
    refundAmount: parsed.refundAmount,
    refundCurrency: parsed.refundCurrency,
    bookingTotalAmount: bookingRow.total_amount,
  });
}
