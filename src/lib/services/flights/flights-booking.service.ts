import "server-only";

import { randomBytes } from "crypto";
import type { FlightPaymentIntentRecord } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma";
import {
  BookingFailedAfterPaymentError,
  BookingFailedRefundedError,
  BookingFailedRefundPendingError,
  AppError,
  PriceChangedError,
} from "@/lib/api/errors";
import { getFlightPaymentsConfig } from "@/config/flight-payments.config";
import { isFlightHoldOrderBackendEnabled } from "@/config/flight-hold.config";
import {
  parseDuffelOrderResponse,
  parseDuffelOrderServicesForDb,
} from "@/lib/duffel/order-parse";
import { createOrder } from "@/lib/duffel/orders";
import { DuffelApiError } from "@/lib/duffel/errors";
import { runCompensationRefundForPitFailure } from "@/lib/services/flights/flight-refund.service";
import {
  confirmDuffelPaymentIntent,
  getDuffelPaymentIntent,
} from "@/lib/duffel/payment-intents";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { serializeBookingResponse } from "@/lib/services/booking.service";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";
import {
  captureDuffelPaymentForInstantBooking,
  FlightCaptureError,
} from "@/lib/services/flights/flight-payment-capture.core";
import {
  encodeAncillarySelection,
  parseAncillarySelectionJson,
  validateAndPriceOrderServices,
} from "@/lib/services/flights/flight-ancillaries.service";
import { refreshFlightOffer } from "@/lib/services/flights/flights-offer.service";
import { toDuffelOrderPassengers } from "@/lib/flights/duffel-order-passengers";
import {
  duffelOrderFailureUserMessage,
  duffelPassengersMissingContact,
} from "@/lib/flights/duffel-order-errors";
import { duffelPassengersMissingInfantLinks } from "@/lib/flights/infant-passenger-linking";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";
import { assertFlightPassengersReadyForDuffelOrder } from "@/lib/flights/flight-passenger-booking-validation";
import { loadFlightPassengerValidationContext } from "@/lib/flights/flight-checkout-validation-context";
import { assertPassengersMatchOffer } from "@/lib/validations/flight-checkout.schema";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";

function bookingRef(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(4).toString("hex");
  return `TTU-${t}-${r}`.toUpperCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Best-effort financial-event log. Never throws — an audit-log failure must
 * not break a booking saga (loss of an event row is recoverable, loss of a
 * booking is not).
 */
async function logEvent(input: {
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
      booking_id: input.booking_id ?? null,
      flight_payment_intent_record_id: input.flight_payment_intent_record_id ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // intentionally swallow
  }
}

function throwTerminalCheckoutReplay(pit: FlightPaymentIntentRecord): never {
  if (!pit.order_failure_at) {
    throw new AppError(500, "Checkout replay invariant failed.", "INTERNAL_ERROR");
  }
  const refundSt = (pit.order_failure_refund_status ?? "").toLowerCase();
  const code = pit.order_failure_code ?? "";
  if (
    code === "BOOKING_FAILED_REFUNDED" ||
    refundSt === "succeeded" ||
    refundSt === "completed"
  ) {
    throw new BookingFailedRefundedError(undefined, pit.duffel_intent_id, pit.order_failure_refund_id);
  }
  if (code === "BOOKING_FAILED_REFUND_PENDING") {
    throw new BookingFailedRefundPendingError(
      undefined,
      pit.duffel_intent_id,
      pit.order_failure_refund_id,
      pit.order_failure_refund_status,
    );
  }
  throw new BookingFailedAfterPaymentError(
    "Payment was received but the airline could not confirm this booking. Please contact support with your payment reference.",
    pit.duffel_intent_id,
    pit.duffel_intent_id,
  );
}

function isDuffelAlreadyConfirmedError(e: unknown): boolean {
  if (!(e instanceof DuffelApiError)) return false;
  const codes = ["payment_intent_already_confirmed", "validation_required"];
  if (codes.some((c) => e.hasDuffelErrorCode(c))) return true;
  const msg = (e.clientMessage ?? "").toLowerCase();
  return msg.includes("already") && msg.includes("confirm");
}

/**
 * Server-side capture of the Duffel PaymentIntent. Per Duffel docs the
 * frontend card collection ONLY tokenises the card; the actual sweep of funds
 * to our Duffel balance (and the Payment row in the dashboard) requires this
 * server-side confirm. We delegate to a pure-function core for testability
 * and translate its `FlightCaptureError` into our `AppError` hierarchy.
 */
/** Best-effort: persist Duffel-reported `fees_amount` / `net_amount` for admin reconciliation. */
async function syncDuffelReportedPitAmounts(duffelIntentId: string): Promise<void> {
  try {
    const remote = await getDuffelPaymentIntent(duffelIntentId);
    if (remote.fees_amount != null || remote.net_amount != null) {
      await flightPaymentIntentRepository.updateDuffelReportedAmounts(duffelIntentId, {
        duffel_reported_fees_amount: remote.fees_amount ?? null,
        duffel_reported_net_amount: remote.net_amount ?? null,
      });
    }
  } catch {
    // reconciliation hint only
  }
}

async function ensureDuffelPaymentCapturedForInstantBooking(pit: {
  duffel_intent_id: string;
  status: string;
}): Promise<{
  confirmed_at: string | null;
  called_confirm: boolean;
  poll_attempts: number;
  final_status: string;
}> {
  try {
    const r = await captureDuffelPaymentForInstantBooking(pit, {
      confirm: confirmDuffelPaymentIntent,
      get: getDuffelPaymentIntent,
      persistStatus: async (id, status) => {
        await flightPaymentIntentRepository.updateStatusByDuffelId(id, status);
      },
      sleep,
      isAlreadyConfirmedError: isDuffelAlreadyConfirmedError,
      asDuffelError: (e) => (e instanceof DuffelApiError ? e : null),
    });
    return {
      confirmed_at: r.confirmed_at,
      called_confirm: r.called_confirm,
      poll_attempts: r.poll_attempts,
      final_status: r.status,
    };
  } catch (e) {
    if (e instanceof FlightCaptureError) {
      const httpStatus =
        e.info.code === "PAYMENT_NOT_CAPTURED" ? 502 : 400;
      throw new AppError(httpStatus, e.info.message, e.info.code);
    }
    throw e;
  }
}

async function createDuffelOrderWithRetries(
  orderBody: Record<string, unknown>,
  idempotencyKey: string | null,
): Promise<unknown> {
  const max = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await createOrder(orderBody, idempotencyKey);
    } catch (e) {
      lastErr = e;
      if (e instanceof DuffelApiError && e.retryable && attempt < max - 1) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function failInstantBookingAfterPaymentCaptured(input: {
  pit: FlightPaymentIntentRecord;
  bookingIdempotencyKey: string | null;
  /** Present when order failed after capture — used for refund notification email only. */
  passengers?: FlightCheckoutBookingBody["passengers"];
  contact?: FlightCheckoutBookingBody["contact"];
  upstreamMessage?: string;
}): Promise<never> {
  const { pit, bookingIdempotencyKey, passengers, contact } = input;
  if (pit.order_failure_at) {
    throwTerminalCheckoutReplay(pit);
  }

  const result = await runCompensationRefundForPitFailure({
    pit,
    bookingIdempotencyKey,
    passengers,
    contactEmail: contact?.email ?? null,
  });

  const terminalCode = result.terminal_code;

  if (terminalCode === "BOOKING_FAILED_REFUNDED") {
    throw new BookingFailedRefundedError(undefined, pit.duffel_intent_id, result.refund_id);
  }
  if (terminalCode === "BOOKING_FAILED_REFUND_PENDING") {
    throw new BookingFailedRefundPendingError(
      undefined,
      pit.duffel_intent_id,
      result.refund_id,
      result.refund_status,
    );
  }
  throw new BookingFailedAfterPaymentError(
    "Payment was received but the airline could not confirm this booking. Please contact support with your payment reference.",
    pit.duffel_intent_id,
    pit.duffel_intent_id,
    input.upstreamMessage,
  );
}

function toDuffelOrderPassengersForOffer(
  passengers: FlightCheckoutBookingBody["passengers"],
  offer: FlightOfferDTO,
  contact: FlightCheckoutBookingBody["contact"],
) {
  return toDuffelOrderPassengers(passengers, offer, contact);
}

export async function createDuffelInstantFlightBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  body: FlightCheckoutBookingBody;
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

  const pitId = input.body.payment_intent_id;
  if (!pitId) {
    throw new AppError(400, "Missing payment intent.", "VALIDATION_ERROR");
  }

  if (input.idempotencyKey) {
    const byFail = await flightPaymentIntentRepository.findByOrderFailureBookingIdempotencyKey(
      input.idempotencyKey,
    );
    if (byFail?.order_failure_at && !byFail.booking_id) {
      if (byFail.duffel_intent_id !== pitId) {
        throw new AppError(
          409,
          "Idempotency-Key does not match this payment session.",
          "IDEMPOTENCY_MISMATCH",
        );
      }
      throwTerminalCheckoutReplay(byFail);
    }
  }

  const pit = await flightPaymentIntentRepository.findByDuffelIntentId(pitId);
  if (!pit) {
    throw new AppError(400, "Unknown payment intent. Start checkout again.", "VALIDATION_ERROR");
  }
  if (pit.offer_id !== input.body.offer_id) {
    throw new AppError(400, "Offer does not match payment intent.", "VALIDATION_ERROR");
  }
  if (pit.booking_id) {
    const existingBooking = await bookingRepository.findById(pit.booking_id);
    if (existingBooking) return serializeBookingResponse(existingBooking);
  }
  if (pit.order_failure_at && !pit.booking_id) {
    throwTerminalCheckoutReplay(pit);
  }

  /**
   * Instant pay-now ordering (Duffel best practice):
   * 1) Validate offer, extras, and passengers **before** capturing the card — avoids charging then failing on PRICE_CHANGED.
   * 2) Confirm PaymentIntent server-side (customer card → our Duffel Balance).
   *    This is the step that creates the Payment row in the Duffel dashboard;
   *    we never short-circuit it on a stale local/remote status.
   * 3) Create air order with `payments: [{ type: "balance" }]` (Balance → airline).
   * True ACID across Duffel + airline is impossible; if step 3 fails we compensate with refund (see `failInstantBookingAfterPaymentCaptured`).
   */
  const pitSel = encodeAncillarySelection(parseAncillarySelectionJson(pit.ancillary_selection));
  const bodySel = encodeAncillarySelection(input.body.services);
  if (pitSel !== bodySel) {
    throw new AppError(400, "Extras do not match this payment session.", "VALIDATION_ERROR");
  }

  const payConfig = getFlightPaymentsConfig();
  const offer = await refreshFlightOffer(input.body.offer_id);

  const refreshed = Number.parseFloat(offer.total_amount);
  const snap = Number.parseFloat(pit.offer_amount);
  if (
    !Number.isFinite(refreshed) ||
    !Number.isFinite(snap) ||
    Math.abs(refreshed - snap) > payConfig.priceToleranceMajor
  ) {
    throw new PriceChangedError();
  }

  const priced = await validateAndPriceOrderServices({
    offerId: input.body.offer_id,
    services: input.body.services,
    offerTotalCurrency: offer.total_currency,
  });
  if (priced.currency !== offer.total_currency) {
    throw new AppError(400, "Extras currency does not match offer.", "VALIDATION_ERROR");
  }
  const snapSvc = Number.parseFloat(pit.services_subtotal_amount ?? "0");
  const nowSvc = Number.parseFloat(priced.servicesSubtotal);
  if (
    !Number.isFinite(snapSvc) ||
    !Number.isFinite(nowSvc) ||
    Math.abs(nowSvc - snapSvc) > payConfig.priceToleranceMajor
  ) {
    throw new PriceChangedError();
  }

  assertPassengersMatchOffer(offer, input.body.passengers);
  const validationCtx = await loadFlightPassengerValidationContext(input.body.search_session_id);
  assertFlightPassengersReadyForDuffelOrder(offer, input.body.passengers, {
    ...validationCtx,
    contact: input.body.contact,
  });

  const duffelPassengers = toDuffelOrderPassengersForOffer(
    input.body.passengers,
    offer,
    input.body.contact,
  );
  const missingContact = duffelPassengersMissingContact(duffelPassengers);
  if (missingContact) {
    throw new AppError(
      400,
      missingContact === "phone"
        ? "A valid contact phone number is required before booking."
        : "A valid contact email is required before booking.",
      "VALIDATION_ERROR",
    );
  }
  if (duffelPassengersMissingInfantLinks(offer, duffelPassengers)) {
    throw new AppError(
      400,
      "Each infant must travel with an accompanying adult before booking.",
      "VALIDATION_ERROR",
    );
  }

  const capture = await ensureDuffelPaymentCapturedForInstantBooking(pit);
  await syncDuffelReportedPitAmounts(pit.duffel_intent_id);
  await logEvent({
    type: "intent_succeeded",
    flight_payment_intent_record_id: pit.id,
    amount: pit.charge_amount,
    currency: pit.charge_currency,
    payload: {
      duffel_intent_id: pit.duffel_intent_id,
      offer_id: offer.id,
      confirmed_at: capture.confirmed_at,
      called_confirm: capture.called_confirm,
      poll_attempts: capture.poll_attempts,
      final_status: capture.final_status,
    },
  });

  const orderTotal = (refreshed + nowSvc).toFixed(2);

  const orderBody: Record<string, unknown> = {
    type: "instant",
    selected_offers: [offer.id],
    payments: [
      {
        type: "balance",
        amount: orderTotal,
        currency: offer.total_currency,
      },
    ],
    metadata: { payment_intent_id: pit.duffel_intent_id },
    passengers: duffelPassengers,
  };
  if (priced.orderServices.length > 0) {
    orderBody.services = priced.orderServices;
  }

  /**
   * Anything thrown between here and successful booking persistence happens
   * AFTER the customer's card was captured. The saga must compensate for ALL
   * failures, not only `DuffelApiError`, otherwise the customer's money sits
   * with us while no order exists. The `failInstantBookingAfterPaymentCaptured`
   * helper persists a terminal failure (idempotent) and triggers Duffel
   * refunds, so a retry with the same Idempotency-Key returns the same
   * terminal error code.
   */
  let raw: unknown;
  try {
    raw = await createDuffelOrderWithRetries(orderBody, input.idempotencyKey);
  } catch (e) {
    const upstreamMessage =
      e instanceof DuffelApiError ? duffelOrderFailureUserMessage(e) : undefined;
    return await failInstantBookingAfterPaymentCaptured({
      pit,
      bookingIdempotencyKey: input.idempotencyKey,
      passengers: input.body.passengers,
      contact: input.body.contact,
      upstreamMessage,
    });
  }

  let parsed: ReturnType<typeof parseDuffelOrderResponse>;
  try {
    parsed = parseDuffelOrderResponse(raw);
  } catch {
    return await failInstantBookingAfterPaymentCaptured({
      pit,
      bookingIdempotencyKey: input.idempotencyKey,
      passengers: input.body.passengers,
      contact: input.body.contact,
    });
  }
  const expiresAt = offer.expires_at ? new Date(offer.expires_at) : null;
  const ancillaries = parseDuffelOrderServicesForDb(parsed.data);

  const guestData = {
    offer_id: offer.id,
    payment_intent_id: pit.duffel_intent_id,
    contact: input.body.contact,
    passengers: input.body.passengers,
    services: input.body.services,
    customer_charge: { amount: pit.charge_amount, currency: pit.charge_currency },
  };

  const row = await bookingRepository.createFlightBookingFromDuffelOrder({
    booking_ref_no: bookingRef(),
    user_id: input.userId,
    type: "flight",
    status: "confirmed",
    payment_status: "paid",
    total_amount: new Prisma.Decimal(parsed.totalAmount),
    currency: parsed.totalCurrency,
    guest_data: guestData as unknown as Prisma.InputJsonValue,
    idempotency_key: input.idempotencyKey,
    linkDuffelPaymentIntentId: pit.duffel_intent_id,
    ancillaries,
    flight: {
      duffel_order_id: parsed.orderId,
      duffel_offer_id: offer.id,
      booking_reference: parsed.bookingReference,
      live_mode: parsed.liveMode,
      last_offer_total_amount: new Prisma.Decimal(offer.total_amount),
      last_offer_total_currency: offer.total_currency,
      offer_expires_at: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      itinerary_snapshot: offer as unknown as Prisma.InputJsonValue,
      order_raw: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });

  const duffelBalanceDebit = (
    Number.parseFloat(pit.offer_amount) + Number.parseFloat(pit.services_subtotal_amount ?? "0")
  ).toFixed(2);

  await logEvent({
    type: "order_placed",
    booking_id: row.id,
    flight_payment_intent_record_id: pit.id,
    amount: parsed.totalAmount,
    currency: parsed.totalCurrency,
    payload: {
      duffel_order_id: parsed.orderId,
      duffel_offer_id: offer.id,
      duffel_intent_id: pit.duffel_intent_id,
      booking_reference: parsed.bookingReference,
      duffel_balance_debit: duffelBalanceDebit,
      customer_paid: pit.charge_amount,
      commission: pit.markup_amount,
      duffel_payment_fee: pit.duffel_payments_fee_amount,
    },
  });

  trackJourneyEvent({
    userId: input.userId,
    eventType: "booking.confirmed",
    productType: "flight",
    productRef: offer.id,
    stage: "booking_confirmed",
    convertedBookingId: row.id,
    properties: { booking_ref_no: row.booking_ref_no, duffel_order_id: parsed.orderId },
    priceAmount: parsed.totalAmount,
    priceCurrency: parsed.totalCurrency,
  });

  return serializeBookingResponse(row);
}

/** Duffel `type: "hold"` — gated by `FLIGHT_HOLD_BACKEND` / `NEXT_PUBLIC_FLIGHT_HOLD_BACKEND`. */
export async function createDuffelHoldFlightBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  body: FlightCheckoutBookingBody;
  idempotencyKey: string | null;
}) {
  if (!isFlightHoldOrderBackendEnabled()) {
    throw new AppError(503, "Hold bookings are not enabled on this environment.", "HOLD_DISABLED");
  }

  if (!input.authz || !hasPermission(input.authz, "bookings:create")) {
    throw new ForbiddenError();
  }

  if (input.idempotencyKey) {
    const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return serializeBookingResponse(existing);
    }
  }

  const offer = await refreshFlightOffer(input.body.offer_id);

  const priced = await validateAndPriceOrderServices({
    offerId: input.body.offer_id,
    services: input.body.services,
    offerTotalCurrency: offer.total_currency,
  });
  if (priced.currency !== offer.total_currency) {
    throw new AppError(400, "Extras currency does not match offer.", "VALIDATION_ERROR");
  }

  assertPassengersMatchOffer(offer, input.body.passengers);
  const validationCtx = await loadFlightPassengerValidationContext(input.body.search_session_id);
  assertFlightPassengersReadyForDuffelOrder(offer, input.body.passengers, {
    ...validationCtx,
    contact: input.body.contact,
  });

  const orderBody: Record<string, unknown> = {
    type: "hold",
    selected_offers: [offer.id],
    passengers: toDuffelOrderPassengersForOffer(input.body.passengers, offer, input.body.contact),
  };
  if (priced.orderServices.length > 0) {
    orderBody.services = priced.orderServices;
  }

  let raw: unknown;
  try {
    raw = await createOrder(orderBody, input.idempotencyKey);
  } catch (e) {
    if (e instanceof DuffelApiError) {
      if (e.hasDuffelErrorCode("unavailable_feature")) {
        throw new AppError(
          403,
          "Hold orders are not available on this Duffel account. Choose Pay now or contact help@duffel.com.",
          "HOLD_UNAVAILABLE",
        );
      }
      throw new AppError(
        502,
        "The airline could not place a hold on this offer. Try again or choose Pay now.",
        "HOLD_ORDER_FAILED",
      );
    }
    throw e;
  }

  const parsed = parseDuffelOrderResponse(raw);
  const expiresAt = offer.expires_at ? new Date(offer.expires_at) : null;
  const ancillaries = parseDuffelOrderServicesForDb(parsed.data);

  const guestData = {
    offer_id: offer.id,
    order_mode: "hold",
    contact: input.body.contact,
    passengers: input.body.passengers,
    services: input.body.services,
  };

  const row = await bookingRepository.createFlightBookingFromDuffelOrder({
    booking_ref_no: bookingRef(),
    user_id: input.userId,
    type: "flight",
    status: "pending",
    payment_status: "unpaid",
    total_amount: new Prisma.Decimal(parsed.totalAmount),
    currency: parsed.totalCurrency,
    guest_data: guestData as unknown as Prisma.InputJsonValue,
    idempotency_key: input.idempotencyKey,
    linkDuffelPaymentIntentId: null,
    ancillaries,
    flight: {
      duffel_order_id: parsed.orderId,
      duffel_offer_id: offer.id,
      booking_reference: parsed.bookingReference,
      live_mode: parsed.liveMode,
      last_offer_total_amount: new Prisma.Decimal(offer.total_amount),
      last_offer_total_currency: offer.total_currency,
      offer_expires_at: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      itinerary_snapshot: offer as unknown as Prisma.InputJsonValue,
      order_raw: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });

  trackJourneyEvent({
    userId: input.userId,
    eventType: "booking.confirmed",
    productType: "flight",
    productRef: offer.id,
    stage: "booking_confirmed",
    convertedBookingId: row.id,
    properties: { booking_ref_no: row.booking_ref_no, order_mode: "hold" },
    priceAmount: parsed.totalAmount,
    priceCurrency: parsed.totalCurrency,
  });

  return serializeBookingResponse(row);
}
