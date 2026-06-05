import "server-only";

import { randomBytes } from "crypto";
import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import { DuffelApiError } from "@/lib/duffel/errors";
import { staysCreateBooking } from "@/lib/duffel/stays-http";
import { parseStaysBooking } from "@/lib/duffel/stays-parse";
import { serializeBookingResponse } from "@/lib/services/booking.service";
import {
  isDuffelStaysRateUnavailableError,
  resolveFreshStaysQuote,
} from "@/lib/services/stays/stays-quote-lifecycle.service";
import type { StaysBookingBodyInput } from "@/lib/validations/stays.schema";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { prisma } from "@/lib/prisma";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import { getStaysPaymentsConfig } from "@/config/stays-payments.config";
import { amountsWithinTolerance } from "@/lib/payments/checkout-pricing";
import {
  captureStripePaymentIntent,
  ensureStripePaymentRequiresCapture,
  voidStripePaymentIntent,
} from "@/lib/payments/stripe-capture.core";
import { getStripeClient, majorToStripeCents } from "@/lib/payments/stripe-client";

function bookingRef(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(4).toString("hex");
  return `TTU-${t}-${r}`.toUpperCase();
}

function stripeDeps() {
  const stripe = getStripeClient();
  return {
    retrieve: async (id: string) => {
      const pi = await stripe.paymentIntents.retrieve(id);
      return {
        id: pi.id,
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
      };
    },
    capture: async (id: string) => {
      const pi = await stripe.paymentIntents.capture(id);
      return {
        id: pi.id,
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
      };
    },
    cancel: async (id: string) => {
      const pi = await stripe.paymentIntents.cancel(id);
      return {
        id: pi.id,
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
      };
    },
    sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  };
}

async function logFinancialEvent(input: {
  booking_id?: string | null;
  checkout_payment_record_id?: string | null;
  type: "intent_succeeded" | "order_placed" | "order_failed";
  amount?: string | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
}) {
  try {
    await bookingFinancialEventRepository.record({
      booking_id: input.booking_id ?? null,
      checkout_payment_record_id: input.checkout_payment_record_id ?? null,
      type: input.type,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort
  }
}

export async function createDuffelStayBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  body: StaysBookingBodyInput;
  idempotencyKey: string | null;
}) {
  if (!input.authz || !hasPermission(input.authz, "bookings:create")) {
    throw new ForbiddenError();
  }

  if (input.idempotencyKey) {
    const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return serializeBookingResponse(existing);
    }
  }

  const paymentRecord = await checkoutPaymentRepository.findById(input.body.checkout_payment_id);
  if (!paymentRecord || paymentRecord.user_id !== input.userId) {
    throw new AppError(400, "Checkout payment session not found.", "CHECKOUT_PAYMENT_NOT_FOUND");
  }
  if (paymentRecord.supplier_ref_id !== input.body.quote_id) {
    throw new AppError(400, "Quote does not match checkout session.", "QUOTE_MISMATCH");
  }
  if (paymentRecord.booking_id) {
    const linked = await bookingRepository.findById(paymentRecord.booking_id);
    if (linked) return serializeBookingResponse(linked);
  }

  const deps = stripeDeps();
  let stripePi;
  try {
    stripePi = await ensureStripePaymentRequiresCapture(deps, paymentRecord.provider_intent_id);
  } catch {
    throw new AppError(402, "Payment is not authorized. Please complete card payment first.", "PAYMENT_NOT_AUTHORIZED");
  }

  const expectedCents = majorToStripeCents(paymentRecord.charge_amount, paymentRecord.charge_currency);
  if (
    stripePi.amount !== expectedCents ||
    stripePi.currency.toLowerCase() !== paymentRecord.charge_currency.toLowerCase()
  ) {
    throw new AppError(400, "Payment amount does not match checkout.", "PAYMENT_AMOUNT_MISMATCH");
  }

  let effectiveQuoteId = input.body.quote_id;
  let quote;
  try {
    quote = await resolveFreshStaysQuote({
      quoteId: input.body.quote_id,
      rateId: input.body.rate_id ?? null,
    });
    effectiveQuoteId = quote.quote_id;
  } catch (e) {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    throw e;
  }

  if (effectiveQuoteId !== paymentRecord.supplier_ref_id) {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    throw new AppError(
      409,
      "Your price lock expired during checkout. Return to the hotel page, select the room again, and complete payment.",
      "QUOTE_STALE",
    );
  }

  if (!quote.total_amount || !quote.total_currency) {
    throw new AppError(400, "Quote has no price.", "QUOTE_INVALID");
  }

  const tolerance = getStaysPaymentsConfig().priceToleranceMajor;
  if (
    quote.total_currency.toUpperCase() !== paymentRecord.supplier_currency.toUpperCase() ||
    !amountsWithinTolerance(paymentRecord.supplier_amount, quote.total_amount, tolerance)
  ) {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    throw new AppError(409, "Price has changed. Please restart checkout.", "PRICE_CHANGED");
  }

  const duffelBody: Record<string, unknown> = {
    quote_id: effectiveQuoteId,
    email: input.body.email,
    phone_number: input.body.phone_number,
    guests: input.body.guests.map((g) => {
      const row: Record<string, string> = {
        given_name: g.given_name,
        family_name: g.family_name,
      };
      if (g.born_on) row.born_on = g.born_on;
      return row;
    }),
  };
  if (input.body.accommodation_special_requests) {
    duffelBody.accommodation_special_requests = input.body.accommodation_special_requests;
  }
  if (input.body.loyalty_programme_account_number?.trim()) {
    duffelBody.loyalty_programme_account_number = input.body.loyalty_programme_account_number.trim();
  }

  let raw: unknown;
  try {
    raw = await staysCreateBooking(duffelBody);
  } catch (e) {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    await logFinancialEvent({
      checkout_payment_record_id: paymentRecord.id,
      type: "order_failed",
      payload: { stage: "duffel_booking", error: e instanceof Error ? e.message : "unknown" },
    });
    if (isDuffelStaysRateUnavailableError(e)) {
      throw new AppError(
        409,
        "This room rate is no longer available. Return to the hotel page, select the room again, and restart checkout.",
        "STAYS_RATE_UNAVAILABLE",
      );
    }
    throw new AppError(502, "Hotel booking failed. Your card was not charged.", "STAYS_BOOKING_FAILED");
  }

  const parsed = parseStaysBooking(raw);
  if (!parsed) {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    throw new AppError(502, "Stay booking response was invalid. Please contact support.", "STAYS_BOOKING_FAILED");
  }
  if (parsed.status && parsed.status !== "confirmed") {
    await voidStripePaymentIntent(deps, paymentRecord.provider_intent_id).catch(() => undefined);
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "voided");
    throw new AppError(502, "Stay booking is not confirmed. Please contact support.", "STAYS_BOOKING_FAILED");
  }

  try {
    await captureStripePaymentIntent(deps, paymentRecord.provider_intent_id);
  } catch {
    await checkoutPaymentRepository.updateStatus(paymentRecord.id, "capture_failed");
    throw new AppError(
      502,
      "Booking confirmed but payment capture failed. Support will complete your payment.",
      "PAYMENT_CAPTURE_FAILED",
    );
  }

  const total = parsed.total_amount ?? paymentRecord.charge_amount;
  const currency = parsed.total_currency ?? paymentRecord.charge_currency;
  const totalDec = new Prisma.Decimal(total);

  const row = await bookingRepository.createHotelStayBookingFromDuffel({
    booking_ref_no: bookingRef(),
    user_id: input.userId,
    type: "hotel",
    status: "confirmed",
    payment_status: "paid",
    total_amount: totalDec,
    currency,
    guest_data: {
      email: input.body.email,
      phone_number: input.body.phone_number,
      guests: input.body.guests,
      checkout_payment_id: paymentRecord.id,
      stripe_payment_intent_id: paymentRecord.provider_intent_id,
      customer_charge: {
        amount: paymentRecord.charge_amount,
        currency: paymentRecord.charge_currency,
      },
      accommodation_special_requests: input.body.accommodation_special_requests?.trim() || null,
      loyalty_programme_account_number: input.body.loyalty_programme_account_number?.trim() || null,
      stay: {
        check_in: input.body.check_in_date ?? null,
        check_out: input.body.check_out_date ?? null,
      },
    } as unknown as Prisma.InputJsonValue,
    idempotency_key: input.idempotencyKey,
    hotel: {
      duffel_booking_id: parsed.id,
      duffel_quote_id: effectiveQuoteId,
      stays_search_result_id: null,
      duffel_accommodation_id:
        parsed.accommodation && typeof parsed.accommodation.id === "string"
          ? parsed.accommodation.id
          : null,
      booking_reference: parsed.reference,
      quote_expires_at: null,
      accommodation_snapshot: (parsed.accommodation ?? {}) as unknown as Prisma.InputJsonValue,
      stays_raw: raw as unknown as Prisma.InputJsonValue,
    },
  });

  await checkoutPaymentRepository.linkBooking(paymentRecord.id, row.id);

  await logFinancialEvent({
    booking_id: row.id,
    checkout_payment_record_id: paymentRecord.id,
    type: "intent_succeeded",
    amount: paymentRecord.charge_amount,
    currency: paymentRecord.charge_currency,
  });
  await logFinancialEvent({
    booking_id: row.id,
    checkout_payment_record_id: paymentRecord.id,
    type: "order_placed",
    amount: total,
    currency,
    payload: { duffel_booking_id: parsed.id },
  });

  const hotelInterest = await prisma.customerProductInterest.findFirst({
    where: {
      user_id: input.userId,
      product_type: "hotel",
      converted_booking_id: null,
    },
    orderBy: { last_seen_at: "desc" },
  });
  const productRef = hotelInterest?.product_ref ?? effectiveQuoteId;

  trackJourneyEvent({
    userId: input.userId,
    eventType: "booking.confirmed",
    productType: "hotel",
    productRef,
    stage: "booking_confirmed",
    convertedBookingId: row.id,
    properties: {
      booking_ref_no: row.booking_ref_no,
      duffel_booking_id: parsed.id,
      quote_id: effectiveQuoteId,
    },
    priceAmount: total,
    priceCurrency: currency,
    title: hotelInterest?.title ?? null,
    subtitle: hotelInterest?.subtitle ?? null,
  });

  return serializeBookingResponse(row);
}
