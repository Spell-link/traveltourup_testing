import "server-only";

import { Prisma } from "@/generated/prisma";
import { AppError, NotFoundError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { prisma } from "@/lib/prisma";
import {
  checkoutPaymentRepository,
  paymentRefundAttemptRepository,
  staysCancellationRepository,
} from "@/lib/db/repositories/checkout-payment.repository";
import { staysCancelBooking } from "@/lib/duffel/stays-http";
import { parseStaysBooking } from "@/lib/duffel/stays-parse";
import { getStripeClient, isStripeConfigured, majorToStripeCents } from "@/lib/payments/stripe-client";
import { serializeBookingResponse } from "@/lib/services/booking.service";
import { trackBookingCancelledJourney } from "@/lib/services/journey/booking-lifecycle-journey.service";
import type { StaysBookingCancelBodyInput } from "@/lib/validations/stays.schema";

function assertCanCancel(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingUserId: string | null;
}) {
  if (!input.authz) throw new ForbiddenError();
  if (hasPermission(input.authz, "bookings:manage")) return;
  if (
    input.bookingUserId === input.userId &&
    hasPermission(input.authz, "bookings:cancel_own")
  ) {
    return;
  }
  throw new ForbiddenError();
}

async function logEvent(input: {
  booking_id: string;
  type: "cancel_confirmed" | "refund_initiated" | "refund_succeeded" | "refund_failed";
  amount?: string | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
}) {
  try {
    await bookingFinancialEventRepository.record({
      booking_id: input.booking_id,
      type: input.type,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort
  }
}

function computeCustomerRefund(input: {
  chargeAmount: string;
  chargeCurrency: string;
  supplierRefundAmount: string | null;
  supplierRefundCurrency: string | null;
}): { amount: string; currency: string } | null {
  const charge = Number.parseFloat(input.chargeAmount);
  if (!Number.isFinite(charge) || charge <= 0) return null;
  const supplier = input.supplierRefundAmount
    ? Number.parseFloat(input.supplierRefundAmount)
    : charge;
  if (!Number.isFinite(supplier) || supplier <= 0) return null;
  const refund = Math.min(charge, supplier);
  if (refund <= 0) return null;
  return {
    amount: refund.toFixed(2),
    currency: input.chargeCurrency.toUpperCase(),
  };
}

export async function processStaysBookingCancel(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
  body: StaysBookingCancelBodyInput;
}) {
  if (input.body.action !== "confirm") {
    throw new AppError(400, "Unsupported cancel action.", "VALIDATION_ERROR");
  }

  const row = await bookingRepository.findById(input.bookingId);
  if (!row) throw new NotFoundError("Booking");
  if (row.type !== "hotel") {
    throw new AppError(400, "Not a hotel booking.", "VALIDATION_ERROR");
  }
  assertCanCancel({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });

  if (row.status === "cancelled") {
    return serializeBookingResponse(row);
  }

  const hotel = row.hotelBooking;
  if (!hotel?.duffel_booking_id) {
    throw new AppError(400, "Hotel booking is missing supplier reference.", "STAYS_CANCEL_FAILED");
  }

  const existingCancel = await staysCancellationRepository.findByHotelBookingId(hotel.id);
  if (existingCancel?.status === "confirmed") {
    const refreshed = await bookingRepository.findById(input.bookingId);
    return serializeBookingResponse(refreshed ?? row);
  }

  const paymentRecord = await checkoutPaymentRepository.findFirstByBookingId(row.id);

  let raw: unknown;
  try {
    raw = await staysCancelBooking(hotel.duffel_booking_id);
  } catch (e) {
    throw new AppError(502, "Could not cancel stay with supplier.", "STAYS_CANCEL_FAILED");
  }

  const parsed = parseStaysBooking(raw);
  const supplierRefundAmount = parsed?.total_amount ?? null;
  const supplierRefundCurrency = parsed?.total_currency ?? row.currency;

  const customerRefund =
    paymentRecord &&
    computeCustomerRefund({
      chargeAmount: paymentRecord.charge_amount,
      chargeCurrency: paymentRecord.charge_currency,
      supplierRefundAmount,
      supplierRefundCurrency,
    });

  const cancelRow = await staysCancellationRepository.create({
    hotel_booking_id: hotel.id,
    checkout_payment_record_id: paymentRecord?.id ?? null,
    duffel_booking_id: hotel.duffel_booking_id,
    status: "pending",
    refund_amount: supplierRefundAmount,
    refund_currency: supplierRefundCurrency,
    customer_refund_amount: customerRefund?.amount ?? null,
    customer_refund_currency: customerRefund?.currency ?? null,
    raw: raw as unknown as Prisma.InputJsonValue,
  });

  await staysCancellationRepository.markConfirmed(cancelRow.id, {
    refund_amount: supplierRefundAmount,
    refund_currency: supplierRefundCurrency,
    customer_refund_amount: customerRefund?.amount ?? null,
    customer_refund_currency: customerRefund?.currency ?? null,
    raw: raw as unknown as Prisma.InputJsonValue,
  });

  await prisma.booking.update({
    where: { id: row.id },
    data: {
      status: "cancelled",
      payment_status: customerRefund ? "refund_processing" : "refunded",
    },
  });

  await logEvent({
    booking_id: row.id,
    type: "cancel_confirmed",
    amount: customerRefund?.amount ?? supplierRefundAmount,
    currency: customerRefund?.currency ?? supplierRefundCurrency,
    payload: { duffel_booking_id: hotel.duffel_booking_id },
  });

  trackBookingCancelledJourney({
    bookingId: row.id,
    properties: {
      booking_ref_no: row.booking_ref_no,
      refund_amount: customerRefund?.amount ?? supplierRefundAmount,
      refund_currency: customerRefund?.currency ?? supplierRefundCurrency,
      duffel_booking_id: hotel.duffel_booking_id,
    },
  });

  if (paymentRecord && customerRefund) {
    const attempt = await paymentRefundAttemptRepository.create({
      booking_id: row.id,
      checkout_payment_record_id: paymentRecord.id,
      stays_cancellation_id: cancelRow.id,
      provider: "stripe",
      amount: customerRefund.amount,
      currency: customerRefund.currency,
      status: "pending",
    });

    await logEvent({
      booking_id: row.id,
      type: "refund_initiated",
      amount: customerRefund.amount,
      currency: customerRefund.currency,
      payload: { payment_refund_attempt_id: attempt.id },
    });

    try {
      const stripe = getStripeClient();
      const refund = await stripe.refunds.create({
        payment_intent: paymentRecord.provider_intent_id,
        amount: majorToStripeCents(customerRefund.amount, customerRefund.currency),
      });
      await paymentRefundAttemptRepository.updateStatus(attempt.id, {
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        provider_refund_id: refund.id,
        raw: refund as unknown as Prisma.InputJsonValue,
      });
      await prisma.booking.update({
        where: { id: row.id },
        data: {
          payment_status:
            Number.parseFloat(customerRefund.amount) + 0.005 >=
            Number.parseFloat(paymentRecord.charge_amount)
              ? "refunded"
              : "partially_refunded",
        },
      });
      await checkoutPaymentRepository.updateStatus(
        paymentRecord.id,
        Number.parseFloat(customerRefund.amount) + 0.005 >=
          Number.parseFloat(paymentRecord.charge_amount)
          ? "refunded"
          : "partial_refund",
      );
      await logEvent({
        booking_id: row.id,
        type: "refund_succeeded",
        amount: customerRefund.amount,
        currency: customerRefund.currency,
        payload: { stripe_refund_id: refund.id },
      });
    } catch (e) {
      await paymentRefundAttemptRepository.updateStatus(attempt.id, {
        status: "failed",
        error_code: e instanceof Error ? e.message : "refund_failed",
      });
      await prisma.booking.update({
        where: { id: row.id },
        data: { payment_status: "refund_failed" },
      });
      await logEvent({
        booking_id: row.id,
        type: "refund_failed",
        amount: customerRefund.amount,
        currency: customerRefund.currency,
      });
    }
  }

  const updated = await bookingRepository.findById(input.bookingId);
  return serializeBookingResponse(updated ?? row);
}

export async function processStaysBookingRefundRetry(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}) {
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) {
    throw new AppError(404, "Booking not found.", "NOT_FOUND");
  }

  assertCanCancel({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });

  if (row.type !== "hotel" || !row.hotelBooking) {
    throw new AppError(400, "Only hotel bookings support this refund retry.", "VALIDATION_ERROR");
  }

  if (row.status !== "cancelled") {
    throw new AppError(409, "Booking must be cancelled before retrying a refund.", "BOOKING_NOT_CANCELLED");
  }

  if (row.payment_status !== "refund_failed") {
    throw new AppError(409, "Refund retry is only available when the last refund attempt failed.", "REFUND_NOT_FAILED");
  }

  const hb = row.hotelBooking;
  const sc = await staysCancellationRepository.findByHotelBookingId(hb.id);
  if (!sc) {
    throw new AppError(400, "No confirmed cancellation found for this booking.", "NOT_FOUND");
  }

  const customerRefund =
    sc.customer_refund_amount && sc.customer_refund_currency
      ? { amount: sc.customer_refund_amount, currency: sc.customer_refund_currency }
      : null;

  if (!customerRefund) {
    throw new AppError(400, "No customer refund amount is available for retry.", "VALIDATION_ERROR");
  }

  const paymentRecord = await checkoutPaymentRepository.findFirstByBookingId(row.id);
  if (!paymentRecord) {
    throw new AppError(400, "No payment record found for this booking.", "VALIDATION_ERROR");
  }

  if (!isStripeConfigured()) {
    throw new AppError(503, "Payments are not configured.", "PAYMENTS_NOT_CONFIGURED");
  }

  const attempt = await paymentRefundAttemptRepository.create({
    booking_id: row.id,
    checkout_payment_record_id: paymentRecord.id,
    stays_cancellation_id: sc.id,
    provider: "stripe",
    amount: customerRefund.amount,
    currency: customerRefund.currency,
    status: "pending",
  });

  await logEvent({
    booking_id: row.id,
    type: "refund_initiated",
    amount: customerRefund.amount,
    currency: customerRefund.currency,
    payload: { payment_refund_attempt_id: attempt.id, retry: true },
  });

  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: paymentRecord.provider_intent_id,
      amount: majorToStripeCents(customerRefund.amount, customerRefund.currency),
    });
    await paymentRefundAttemptRepository.updateStatus(attempt.id, {
      status: refund.status === "succeeded" ? "succeeded" : "pending",
      provider_refund_id: refund.id,
      raw: refund as unknown as Prisma.InputJsonValue,
    });
    await prisma.booking.update({
      where: { id: row.id },
      data: {
        payment_status:
          Number.parseFloat(customerRefund.amount) + 0.005 >=
          Number.parseFloat(paymentRecord.charge_amount)
            ? "refunded"
            : "partially_refunded",
      },
    });
    await checkoutPaymentRepository.updateStatus(
      paymentRecord.id,
      Number.parseFloat(customerRefund.amount) + 0.005 >=
        Number.parseFloat(paymentRecord.charge_amount)
        ? "refunded"
        : "partial_refund",
    );
    await logEvent({
      booking_id: row.id,
      type: "refund_succeeded",
      amount: customerRefund.amount,
      currency: customerRefund.currency,
      payload: { stripe_refund_id: refund.id, retry: true },
    });
  } catch (e) {
    await paymentRefundAttemptRepository.updateStatus(attempt.id, {
      status: "failed",
      error_code: e instanceof Error ? e.message : "refund_failed",
    });
    await prisma.booking.update({
      where: { id: row.id },
      data: { payment_status: "refund_failed" },
    });
    await logEvent({
      booking_id: row.id,
      type: "refund_failed",
      amount: customerRefund.amount,
      currency: customerRefund.currency,
      payload: { retry: true },
    });
  }

  const updated = await bookingRepository.findById(row.id);
  if (!updated) {
    throw new AppError(500, "Booking disappeared after refund retry.", "INTERNAL_ERROR");
  }

  return serializeBookingResponse(updated);
}
