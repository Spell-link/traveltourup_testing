import "server-only";

import { Prisma } from "@/generated/prisma";
import { mapDuffelOfferToDto } from "@/lib/duffel/dto/flight-offer.dto";
import { parseOrderChangeOfferSlices } from "@/lib/flights/order-change-offer-slices";
import { getFlightPaymentsConfig } from "@/config/flight-payments.config";
import { AppError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { DuffelApiError } from "@/lib/duffel/errors";
import {
  confirmOrderChange,
  createOrderChange,
  createOrderChangeRequest,
  getOrderChange,
  type DuffelOrderChangeSlicesBody,
} from "@/lib/duffel/order-changes";
import { getDuffelOrder } from "@/lib/duffel/orders";
import {
  confirmDuffelPaymentIntent,
  createDuffelPaymentIntent,
  getDuffelPaymentIntent,
} from "@/lib/duffel/payment-intents";
import { createDuffelPaymentRefund } from "@/lib/duffel/refunds";
import { evaluateFlightChangePolicy } from "@/lib/flights/flight-change-policy";
import {
  buildOrderChangeSlicesBody,
  orderChangeSliceFingerprint,
  parseOrderChangeSlicesFromOrderRaw,
  type OrderChangeSliceOption,
} from "@/lib/flights/order-change-slices";
import { prisma } from "@/lib/prisma";
import { computeOrderChangePaymentBreakdown } from "@/lib/payments/duffel-intent-pricing";
import {
  captureDuffelPaymentForInstantBooking,
  FlightCaptureError,
} from "@/lib/services/flights/flight-payment-capture.core";
import { sendFlightOrderChangeEmailSafe } from "@/lib/services/flights/flight-emails.service";
import type {
  FlightOrderChangeConfirmBody,
  FlightOrderChangePaymentIntentBody,
  FlightOrderChangeQuoteBody,
} from "@/lib/validations/flight-order-change.schema";

export { assertCanChangeFlightBooking } from "@/lib/services/flights/flight-order-change-auth";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isDuffelAlreadyConfirmedError(e: unknown): boolean {
  return e instanceof DuffelApiError && e.hasDuffelErrorCode("payment_intent_already_confirmed");
}

function unwrap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const data = (raw as { data?: unknown }).data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : (raw as Record<string, unknown>);
}

function findOrderChangeOfferNewTotal(
  changeRaw: unknown,
  offerId: string,
): { amount: string; currency: string } | null {
  const data = unwrap(changeRaw);
  const offers = Array.isArray(data.order_change_offers) ? data.order_change_offers : [];
  for (const item of offers) {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!o || o.id !== offerId) continue;
    const amount = typeof o.new_total_amount === "string" ? o.new_total_amount : null;
    const currency = typeof o.new_total_currency === "string" ? o.new_total_currency : null;
    if (amount && currency) return { amount, currency };
  }
  return null;
}

function patchDuffelOrderRawTotal(
  raw: unknown,
  amount: string,
  currency: string,
): unknown {
  if (!raw || typeof raw !== "object") {
    return { total_amount: amount, total_currency: currency };
  }
  const root = raw as Record<string, unknown>;
  if (root.data && typeof root.data === "object") {
    return {
      ...root,
      data: {
        ...(root.data as Record<string, unknown>),
        total_amount: amount,
        total_currency: currency,
      },
    };
  }
  return { ...root, total_amount: amount, total_currency: currency };
}

export type OrderChangeOfferSummary = {
  id: string;
  change_total_amount: string | null;
  change_total_currency: string | null;
  new_total_amount: string | null;
  new_total_currency: string | null;
  penalty_total_amount: string | null;
  penalty_total_currency: string | null;
  refund_to: string | null;
  expires_at: string | null;
  itinerary_summary: string | null;
  new_slice_summary: string | null;
  /** Full Duffel `slices.add` / `slices.remove` for UI adapters. */
  slices: ReturnType<typeof parseOrderChangeOfferSlices>;
};

type ParsedOrderChangeRequest = {
  id: string;
  expires_at: string | null;
  order_change_offers: OrderChangeOfferSummary[];
};

function summarizeNewSliceDetail(slices: unknown): string | null {
  if (!slices || typeof slices !== "object") return null;
  const add = (slices as { add?: unknown }).add;
  if (!Array.isArray(add) || add.length === 0) return null;
  const sl = add[0];
  if (!sl || typeof sl !== "object") return null;
  const s = sl as Record<string, unknown>;
  const segs = Array.isArray(s.segments) ? s.segments : [];
  const first = segs[0] && typeof segs[0] === "object" ? (segs[0] as Record<string, unknown>) : null;
  const last =
    segs.length > 0 && segs[segs.length - 1] && typeof segs[segs.length - 1] === "object"
      ? (segs[segs.length - 1] as Record<string, unknown>)
      : first;
  const origin =
    first && first.origin && typeof first.origin === "object"
      ? ((first.origin as Record<string, unknown>).iata_code as string | undefined)
      : undefined;
  const dest =
    last && last.destination && typeof last.destination === "object"
      ? ((last.destination as Record<string, unknown>).iata_code as string | undefined)
      : undefined;
  const carrier =
    first && first.marketing_carrier && typeof first.marketing_carrier === "object"
      ? ((first.marketing_carrier as Record<string, unknown>).name as string | undefined)
      : undefined;
  const fn = first && typeof first.marketing_carrier_flight_number === "string"
    ? first.marketing_carrier_flight_number
    : first && typeof first.flight_number === "string"
      ? first.flight_number
      : null;
  const cabin = first && typeof first.cabin_class === "string" ? first.cabin_class.replace(/_/g, " ") : null;
  const stops = segs.length <= 1 ? "Non-stop" : `${segs.length - 1} stop${segs.length > 2 ? "s" : ""}`;
  const parts = [
    origin && dest ? `${origin} → ${dest}` : null,
    carrier ? (fn ? `${carrier} ${fn}` : carrier) : null,
    cabin,
    stops,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function summarizeSliceItinerary(slices: unknown): string | null {
  if (!slices || typeof slices !== "object") return null;
  const add = (slices as { add?: unknown }).add;
  if (!Array.isArray(add) || add.length === 0) return null;
  const sl = add[0];
  if (!sl || typeof sl !== "object") return null;
  const s = sl as Record<string, unknown>;
  const segs = Array.isArray(s.segments) ? s.segments : [];
  const first = segs[0] && typeof segs[0] === "object" ? (segs[0] as Record<string, unknown>) : null;
  const origin =
    first && first.origin && typeof first.origin === "object"
      ? ((first.origin as Record<string, unknown>).iata_code as string | undefined)
      : undefined;
  const dest =
    first && first.destination && typeof first.destination === "object"
      ? ((first.destination as Record<string, unknown>).iata_code as string | undefined)
      : undefined;
  const dep = first && typeof first.departing_at === "string" ? first.departing_at.slice(0, 16) : null;
  if (origin && dest) return `${origin} → ${dest}${dep ? ` · ${dep}` : ""}`;
  return null;
}

function parseOrderChangeRequest(raw: unknown): ParsedOrderChangeRequest {
  const data = unwrap(raw);
  const id = typeof data.id === "string" ? data.id : null;
  if (!id) {
    throw new AppError(502, "Order change supplier returned an invalid response.", "UPSTREAM_ERROR");
  }
  const offersRaw = Array.isArray(data.order_change_offers) ? data.order_change_offers : [];
  const offers = offersRaw
    .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
    .map((o) => ({
      id: typeof o.id === "string" ? o.id : "",
      change_total_amount:
        typeof o.change_total_amount === "string" ? o.change_total_amount : null,
      change_total_currency:
        typeof o.change_total_currency === "string" ? o.change_total_currency : null,
      new_total_amount: typeof o.new_total_amount === "string" ? o.new_total_amount : null,
      new_total_currency:
        typeof o.new_total_currency === "string" ? o.new_total_currency : null,
      penalty_total_amount:
        typeof o.penalty_total_amount === "string" ? o.penalty_total_amount : null,
      penalty_total_currency:
        typeof o.penalty_total_currency === "string" ? o.penalty_total_currency : null,
      refund_to: typeof o.refund_to === "string" ? o.refund_to : null,
      expires_at: typeof o.expires_at === "string" ? o.expires_at : null,
      itinerary_summary: summarizeSliceItinerary(o.slices),
      new_slice_summary: summarizeNewSliceDetail(o.slices),
      slices: parseOrderChangeOfferSlices(o.slices),
    }))
    .filter((o) => o.id !== "");
  return {
    id,
    expires_at: typeof data.expires_at === "string" ? data.expires_at : null,
    order_change_offers: offers,
  };
}

type ParsedOrderChange = {
  id: string;
  confirmed_at: string | null;
  change_total_amount: string | null;
  change_total_currency: string | null;
  refund_to: string | null;
};

function parseOrderChange(raw: unknown): ParsedOrderChange {
  const data = unwrap(raw);
  const id = typeof data.id === "string" ? data.id : null;
  if (!id) {
    throw new AppError(502, "Order change supplier returned an invalid response.", "UPSTREAM_ERROR");
  }
  return {
    id,
    confirmed_at: typeof data.confirmed_at === "string" ? data.confirmed_at : null,
    change_total_amount:
      typeof data.change_total_amount === "string" ? data.change_total_amount : null,
    change_total_currency:
      typeof data.change_total_currency === "string" ? data.change_total_currency : null,
    refund_to: typeof data.refund_to === "string" ? data.refund_to : null,
  };
}

async function resolvePendingOrderChange(input: {
  change: {
    id: string;
    duffel_order_change_id: string | null;
    raw: unknown;
  };
  orderChangeOfferId: string;
}): Promise<{ parsed: ParsedOrderChange; raw: unknown }> {
  if (input.change.duffel_order_change_id) {
    const remote = await getOrderChange(input.change.duffel_order_change_id);
    return { parsed: parseOrderChange(remote), raw: remote };
  }

  try {
    const raw = await createOrderChange(input.orderChangeOfferId);
    return { parsed: parseOrderChange(raw), raw };
  } catch (e) {
    if (
      e instanceof DuffelApiError &&
      e.hasDuffelErrorCode("order_change_offer_already_exists")
    ) {
      const ocrId =
        input.change.duffel_order_change_id ??
        (await prisma.flightOrderChange.findFirst({
          where: { id: input.change.id },
          select: { duffel_order_change_id: true },
        }))?.duffel_order_change_id;
      if (ocrId) {
        const remote = await getOrderChange(ocrId);
        return { parsed: parseOrderChange(remote), raw: remote };
      }
    }
    throw e;
  }
}

async function logChangeEvent(input: {
  type: "change_quoted" | "change_confirmed" | "intent_created";
  bookingId: string;
  flightPaymentIntentRecordId?: string | null;
  amount?: string | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await bookingFinancialEventRepository.record({
      type: input.type,
      booking_id: input.bookingId,
      flight_payment_intent_record_id: input.flightPaymentIntentRecordId ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort
  }
}

async function loadChangeableBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}) {
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) throw new AppError(404, "Booking not found.", "NOT_FOUND");
  const { assertCanChangeFlightBooking } = await import(
    "@/lib/services/flights/flight-order-change-auth"
  );
  assertCanChangeFlightBooking({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });
  if (row.type !== "flight" || !row.flightBooking) {
    throw new AppError(400, "Only flight bookings support changes.", "VALIDATION_ERROR");
  }
  if (row.status !== "confirmed") {
    throw new AppError(409, "Only confirmed bookings can be changed.", "BOOKING_NOT_CHANGEABLE");
  }
  const orderId = row.flightBooking.duffel_order_id;
  if (!orderId) {
    throw new AppError(400, "This booking has no Duffel order.", "VALIDATION_ERROR");
  }
  return row;
}

function assertOrderChangePolicyAllowed(orderRaw: unknown): void {
  const policy = evaluateFlightChangePolicy(orderRaw);
  if (!policy.allowed) {
    throw new AppError(409, policy.message, "BOOKING_NOT_CHANGEABLE");
  }
}

function normalizeQuoteBody(
  body: FlightOrderChangeQuoteBody,
  sliceOptions: OrderChangeSliceOption[],
): { slices: DuffelOrderChangeSlicesBody; fingerprint: string } {
  if ("slices" in body) {
    const fp = JSON.stringify(body.slices);
    return { slices: body.slices, fingerprint: fp };
  }
  const origin = (body.origin ?? "").trim().toUpperCase();
  const destination = (body.destination ?? "").trim().toUpperCase();
  const selected = sliceOptions.find((s) => s.slice_id === body.selected_slice_id);
  if (!selected) {
    throw new AppError(400, "Selected leg not found on this booking.", "VALIDATION_ERROR");
  }
  const slices = buildOrderChangeSlicesBody({
    selected_slice_id: body.selected_slice_id,
    departure_date: body.departure_date,
    origin: origin || undefined,
    destination: destination || undefined,
    cabin_class: body.cabin_class,
    slices: sliceOptions,
  });
  const fingerprint = orderChangeSliceFingerprint({
    selected_slice_id: body.selected_slice_id,
    departure_date: body.departure_date,
    origin: slices.add[0]?.origin ?? origin,
    destination: slices.add[0]?.destination ?? destination,
    cabin_class: body.cabin_class ?? selected.cabin_class,
  });
  return { slices, fingerprint };
}

async function ensurePaymentCaptured(pit: { duffel_intent_id: string; status: string }) {
  try {
    return await captureDuffelPaymentForInstantBooking(pit, {
      confirm: confirmDuffelPaymentIntent,
      get: getDuffelPaymentIntent,
      persistStatus: async (id, status) => {
        await flightPaymentIntentRepository.updateStatusByDuffelId(id, status);
      },
      sleep,
      isAlreadyConfirmedError: isDuffelAlreadyConfirmedError,
      asDuffelError: (e) => (e instanceof DuffelApiError ? e : null),
    });
  } catch (e) {
    if (e instanceof FlightCaptureError) {
      const httpStatus = e.info.code === "PAYMENT_NOT_CAPTURED" ? 502 : 400;
      throw new AppError(httpStatus, e.info.message, e.info.code);
    }
    throw e;
  }
}

async function syncBookingOrderFromDuffel(input: {
  flightBookingId: string;
  bookingId: string;
  duffelOrderId: string;
  bookingTotalOverride?: { amount: string; currency: string } | null;
}) {
  const fresh = await getDuffelOrder(input.duffelOrderId);
  const data = unwrap(fresh);
  const override = input.bookingTotalOverride;
  const totalStr =
    override?.amount ??
    (typeof data.total_amount === "string" ? data.total_amount : null);
  const currencyStr =
    override?.currency ??
    (typeof data.total_currency === "string" ? data.total_currency : null);
  const orderRaw =
    override && totalStr && currencyStr
      ? patchDuffelOrderRawTotal(fresh, totalStr, currencyStr)
      : fresh;

  let itinerarySnapshot: Prisma.InputJsonValue | undefined;
  try {
    itinerarySnapshot = mapDuffelOfferToDto(orderRaw) as unknown as Prisma.InputJsonValue;
  } catch {
    itinerarySnapshot = undefined;
  }

  await prisma.flightBooking.update({
    where: { id: input.flightBookingId },
    data: {
      order_raw: orderRaw as unknown as Prisma.InputJsonValue,
      ...(itinerarySnapshot ? { itinerary_snapshot: itinerarySnapshot } : {}),
      booking_reference:
        typeof data.booking_reference === "string" ? data.booking_reference : undefined,
      ...(totalStr
        ? {
            last_offer_total_amount: new Prisma.Decimal(totalStr),
            last_offer_total_currency: currencyStr ?? undefined,
          }
        : {}),
    },
  });

  if (totalStr) {
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        total_amount: new Prisma.Decimal(totalStr),
        ...(currencyStr ? { currency: currencyStr } : {}),
      },
    });
  }
}

async function issueOrderChangeCreditRefund(input: {
  bookingId: string;
  refundAmount: string;
  refundCurrency: string;
  duffelOrderChangeId: string;
}): Promise<void> {
  const pit = await flightPaymentIntentRepository.findFirstByBookingId(input.bookingId);
  if (!pit) return;
  try {
    const refund = await createDuffelPaymentRefund({
      payment_intent_id: pit.duffel_intent_id,
      amount: input.refundAmount,
      currency: input.refundCurrency,
    });
    await logChangeEvent({
      type: "change_confirmed",
      bookingId: input.bookingId,
      flightPaymentIntentRecordId: pit.id,
      amount: input.refundAmount,
      currency: input.refundCurrency,
      payload: {
        duffel_order_change_id: input.duffelOrderChangeId,
        credit_refund: true,
        duffel_refund_id: refund.id,
      },
    });
  } catch {
    // best-effort — ops can retry via refund tools
  }
}

export async function getOrderChangeContextForBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}): Promise<{
  booking_id: string;
  duffel_order_id: string;
  slices: OrderChangeSliceOption[];
  changeable: boolean;
  change_allowed: boolean;
  change_policy_message: string;
}> {
  const row = await loadChangeableBooking(input);
  const orderRaw = row.flightBooking!.order_raw;
  const slices = parseOrderChangeSlicesFromOrderRaw(orderRaw);
  const policy = evaluateFlightChangePolicy(orderRaw);
  const hasSlices = slices.length > 0;
  return {
    booking_id: row.id,
    duffel_order_id: row.flightBooking!.duffel_order_id!,
    slices,
    changeable: hasSlices && policy.allowed,
    change_allowed: policy.allowed,
    change_policy_message: policy.message,
  };
}

export type OrderChangeQuoteResult = {
  id: string;
  status: string;
  duffel_order_change_request_id: string;
  quote_expires_at: string | null;
  offers: OrderChangeOfferSummary[];
};

export async function requestOrderChangeQuote(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
  body: FlightOrderChangeQuoteBody;
}): Promise<OrderChangeQuoteResult> {
  const row = await loadChangeableBooking(input);
  assertOrderChangePolicyAllowed(row.flightBooking!.order_raw);
  const sliceOptions = parseOrderChangeSlicesFromOrderRaw(row.flightBooking!.order_raw);
  const { slices, fingerprint } = normalizeQuoteBody(input.body, sliceOptions);

  const existing = await prisma.flightOrderChange.findFirst({
    where: {
      flight_booking_id: row.flightBooking!.id,
      status: "quoted",
      quote_expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });
  if (existing?.raw && typeof existing.raw === "object") {
    const prevFp = (existing.raw as { _slice_fingerprint?: string })._slice_fingerprint;
    if (prevFp === fingerprint && existing.duffel_order_change_request_id) {
      const parsed = parseOrderChangeRequest(existing.raw);
      return {
        id: existing.id,
        status: existing.status,
        duffel_order_change_request_id: existing.duffel_order_change_request_id,
        quote_expires_at: existing.quote_expires_at?.toISOString() ?? null,
        offers: parsed.order_change_offers,
      };
    }
  }

  let raw: unknown;
  try {
    raw = await createOrderChangeRequest({
      orderId: row.flightBooking!.duffel_order_id!,
      slices,
    });
  } catch (e) {
    if (e instanceof DuffelApiError) {
      throw new AppError(
        502,
        e.clientMessage || "Airline could not produce a change quote.",
        "UPSTREAM_ERROR",
      );
    }
    throw e;
  }

  const parsed = parseOrderChangeRequest(raw);
  const expiresAt = parsed.expires_at ? new Date(parsed.expires_at) : null;
  const validExpiresAt = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
  const rawWithMeta = {
    ...(unwrap(raw) as object),
    _slice_fingerprint: fingerprint,
  };

  await prisma.flightOrderChange.updateMany({
    where: {
      flight_booking_id: row.flightBooking!.id,
      status: "quoted",
    },
    data: { status: "expired" },
  });

  const persisted = await prisma.flightOrderChange.create({
    data: {
      flight_booking_id: row.flightBooking!.id,
      source: "user",
      duffel_order_change_request_id: parsed.id,
      status: "quoted",
      quote_expires_at: validExpiresAt,
      raw: rawWithMeta as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    id: persisted.id,
    status: persisted.status,
    duffel_order_change_request_id: parsed.id,
    quote_expires_at: validExpiresAt ? validExpiresAt.toISOString() : null,
    offers: parsed.order_change_offers,
  };
}

export async function createOrderChangePaymentIntentForBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
  orderChangeId: string;
  body: FlightOrderChangePaymentIntentBody;
}): Promise<{
  needs_payment: boolean;
  duffel_order_change_id: string | null;
  change_total_amount: string | null;
  change_total_currency: string | null;
  payment_intent?: {
    payment_intent_id: string;
    client_token: string;
    status: string;
    customer_charge_amount: string;
    customer_charge_currency: string;
  };
}> {
  const row = await loadChangeableBooking(input);
  const change = await prisma.flightOrderChange.findFirst({
    where: { id: input.orderChangeId, flight_booking_id: row.flightBooking!.id },
  });
  if (!change) throw new AppError(404, "Order change not found for this booking.", "NOT_FOUND");
  if (change.status !== "quoted" && change.status !== "pending_payment") {
    throw new AppError(409, "This change quote is no longer valid.", "ORDER_CHANGE_INVALID");
  }
  if (change.quote_expires_at && change.quote_expires_at < new Date()) {
    await prisma.flightOrderChange.update({ where: { id: change.id }, data: { status: "expired" } });
    throw new AppError(410, "Order change quote expired.", "QUOTE_EXPIRED");
  }

  let parsed: ParsedOrderChange;
  let pendingRaw: unknown;
  try {
    const resolved = await resolvePendingOrderChange({
      change: {
        id: change.id,
        duffel_order_change_id: change.duffel_order_change_id,
        raw: change.raw,
      },
      orderChangeOfferId: input.body.order_change_offer_id,
    });
    parsed = resolved.parsed;
    pendingRaw = resolved.raw;
  } catch (e) {
    if (e instanceof DuffelApiError) {
      throw new AppError(
        502,
        e.clientMessage || "Airline could not create the pending change.",
        "UPSTREAM_ERROR",
      );
    }
    throw e;
  }

  if (!change.duffel_order_change_id || change.duffel_order_change_id !== parsed.id) {
    await prisma.flightOrderChange.update({
      where: { id: change.id },
      data: {
        duffel_order_change_id: parsed.id,
        change_amount: parsed.change_total_amount,
        change_currency: parsed.change_total_currency,
        raw: pendingRaw as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const changeTotal = Number.parseFloat(parsed.change_total_amount ?? "0");
  if (!Number.isFinite(changeTotal) || changeTotal <= 0) {
    return {
      needs_payment: false,
      duffel_order_change_id: parsed.id,
      change_total_amount: parsed.change_total_amount,
      change_total_currency: parsed.change_total_currency,
    };
  }

  const cfg = getFlightPaymentsConfig();
  const breakdown = computeOrderChangePaymentBreakdown(
    parsed.change_total_amount!,
    parsed.change_total_currency ?? row.currency,
    cfg,
  );

  const pitRemote = await createDuffelPaymentIntent({
    amount: breakdown.charge_amount,
    currency: breakdown.charge_currency,
  });
  if (!pitRemote.client_token || !pitRemote.id) {
    throw new AppError(502, "Invalid payment intent from supplier.", "PAYMENT_INTENT_INVALID");
  }

  const chargeN = Number.parseFloat(breakdown.charge_amount);
  const subtotalN = Number.parseFloat(breakdown.subtotal_charged);
  const pitRow = await flightPaymentIntentRepository.create({
    duffel_intent_id: pitRemote.id,
    offer_id: `order_change_${change.id}`,
    charge_amount: breakdown.charge_amount,
    charge_currency: breakdown.charge_currency,
    offer_amount: breakdown.offer_total,
    offer_currency: breakdown.offer_currency,
    markup_amount: breakdown.markup_amount,
    services_subtotal_amount: "0.00",
    subtotal_charged_amount: breakdown.subtotal_charged,
    duffel_payments_fee_amount: (Math.round((chargeN - subtotalN) * 100) / 100).toFixed(2),
    duffel_payments_fee_rate: String(cfg.duffelPaymentsFeeRate),
    fx_rate_applied: String(cfg.fxRateToCustomerCurrency),
    commission_percent_applied: String(cfg.commissionPercent),
    markup_fixed_applied: cfg.markupFixed,
    applied_pricing_rule_id: null,
    status: pitRemote.status || "requires_payment_method",
    client_token: pitRemote.client_token,
    idempotency_key: null,
  });
  await flightPaymentIntentRepository.linkBooking(pitRemote.id, row.id);

  await prisma.flightOrderChange.update({
    where: { id: change.id },
    data: {
      status: "pending_payment",
      flight_payment_intent_record_id: pitRow.id,
      duffel_order_change_id: parsed.id,
      change_amount: parsed.change_total_amount,
      change_currency: parsed.change_total_currency,
    },
  });

  await logChangeEvent({
    type: "intent_created",
    bookingId: row.id,
    flightPaymentIntentRecordId: pitRow.id,
    amount: breakdown.charge_amount,
    currency: breakdown.charge_currency,
    payload: {
      duffel_order_change_id: parsed.id,
      order_change_offer_id: input.body.order_change_offer_id,
      flow: "order_change",
    },
  });

  return {
    needs_payment: true,
    duffel_order_change_id: parsed.id,
    change_total_amount: parsed.change_total_amount,
    change_total_currency: parsed.change_total_currency,
    payment_intent: {
      payment_intent_id: pitRemote.id,
      client_token: pitRemote.client_token,
      status: pitRemote.status || "requires_payment_method",
      customer_charge_amount: breakdown.charge_amount,
      customer_charge_currency: breakdown.charge_currency,
    },
  };
}

export async function confirmOrderChangeForBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
  orderChangeId: string;
  body: FlightOrderChangeConfirmBody;
}): Promise<{
  id: string;
  status: string;
  duffel_order_change_id: string;
  change_total_amount: string | null;
  change_total_currency: string | null;
  confirmed_at: string | null;
  needs_payment: boolean;
}> {
  const row = await loadChangeableBooking(input);
  const change = await prisma.flightOrderChange.findFirst({
    where: { id: input.orderChangeId, flight_booking_id: row.flightBooking!.id },
  });
  if (!change) throw new AppError(404, "Order change not found for this booking.", "NOT_FOUND");
  if (!["quoted", "pending_payment"].includes(change.status)) {
    throw new AppError(409, "This change quote is no longer valid.", "ORDER_CHANGE_INVALID");
  }
  if (change.quote_expires_at && change.quote_expires_at < new Date()) {
    await prisma.flightOrderChange.update({ where: { id: change.id }, data: { status: "expired" } });
    throw new AppError(410, "Order change quote expired.", "QUOTE_EXPIRED");
  }

  let parsed: ParsedOrderChange;
  try {
    const resolved = await resolvePendingOrderChange({
      change: {
        id: change.id,
        duffel_order_change_id: change.duffel_order_change_id,
        raw: change.raw,
      },
      orderChangeOfferId: input.body.order_change_offer_id,
    });
    parsed = resolved.parsed;
    if (!change.duffel_order_change_id || change.duffel_order_change_id !== parsed.id) {
      await prisma.flightOrderChange.update({
        where: { id: change.id },
        data: {
          duffel_order_change_id: parsed.id,
          change_amount: parsed.change_total_amount,
          change_currency: parsed.change_total_currency,
          raw: resolved.raw as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (e) {
    if (e instanceof DuffelApiError) {
      throw new AppError(
        502,
        e.clientMessage || "Airline could not confirm the change.",
        "UPSTREAM_ERROR",
      );
    }
    throw e;
  }

  const changeTotal = Number.parseFloat(parsed.change_total_amount ?? "0");
  const needsPayment = Number.isFinite(changeTotal) && changeTotal > 0;

  if (needsPayment) {
    const pitId = input.body.payment_intent_id;
    if (!pitId) {
      throw new AppError(400, "Payment is required for this change.", "PAYMENT_REQUIRED");
    }
    const pit = await flightPaymentIntentRepository.findByDuffelIntentId(pitId);
    if (!pit || pit.booking_id !== row.id) {
      throw new AppError(400, "Invalid payment session for this booking.", "VALIDATION_ERROR");
    }
    await ensurePaymentCaptured(pit);
    try {
      await confirmOrderChange(parsed.id, {
        type: "balance",
        amount: parsed.change_total_amount!,
        currency: parsed.change_total_currency!,
      });
    } catch (e) {
      if (e instanceof DuffelApiError) {
        throw new AppError(
          502,
          e.clientMessage || "Airline could not confirm the change.",
          "UPSTREAM_ERROR",
        );
      }
      throw e;
    }
  } else {
    if (!parsed.confirmed_at) {
      try {
        await confirmOrderChange(parsed.id);
      } catch (e) {
        if (e instanceof DuffelApiError) {
          throw new AppError(
            502,
            e.clientMessage || "Airline could not confirm the change.",
            "UPSTREAM_ERROR",
          );
        }
        throw e;
      }
    }

    if (
      Number.isFinite(changeTotal) &&
      changeTotal < 0 &&
      parsed.refund_to === "original_form_of_payment" &&
      parsed.change_total_amount &&
      parsed.change_total_currency
    ) {
      const abs = Math.abs(changeTotal).toFixed(2);
      await issueOrderChangeCreditRefund({
        bookingId: row.id,
        refundAmount: abs,
        refundCurrency: parsed.change_total_currency,
        duffelOrderChangeId: parsed.id,
      });
    }
  }

  const confirmedRemote = await getOrderChange(parsed.id);
  const confirmedParsed = parseOrderChange(confirmedRemote);
  const newTripTotal = findOrderChangeOfferNewTotal(
    change.raw,
    input.body.order_change_offer_id,
  );

  await syncBookingOrderFromDuffel({
    flightBookingId: row.flightBooking!.id,
    bookingId: row.id,
    duffelOrderId: row.flightBooking!.duffel_order_id!,
    bookingTotalOverride: newTripTotal,
  });

  const quoteRaw = unwrap(change.raw);
  const confirmedRaw = unwrap(confirmedRemote);
  await prisma.flightOrderChange.update({
    where: { id: change.id },
    data: {
      duffel_order_change_id: confirmedParsed.id,
      change_amount: confirmedParsed.change_total_amount,
      change_currency: confirmedParsed.change_total_currency,
      confirmed_at: confirmedParsed.confirmed_at
        ? new Date(confirmedParsed.confirmed_at)
        : new Date(),
      status: "confirmed",
      raw: {
        ...quoteRaw,
        ...confirmedRaw,
        _confirmed_offer_id: input.body.order_change_offer_id,
        ...(Array.isArray(quoteRaw.order_change_offers)
          ? { order_change_offers: quoteRaw.order_change_offers }
          : {}),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await logChangeEvent({
    type: "change_confirmed",
    bookingId: row.id,
    flightPaymentIntentRecordId: change.flight_payment_intent_record_id,
    amount: confirmedParsed.change_total_amount,
    currency: confirmedParsed.change_total_currency,
    payload: {
      duffel_order_change_id: confirmedParsed.id,
      duffel_order_change_request_id: change.duffel_order_change_request_id,
      paid: needsPayment,
    },
  });

  await sendFlightOrderChangeEmailSafe({
    booking: row,
    changeAmount: confirmedParsed.change_total_amount,
    changeCurrency: confirmedParsed.change_total_currency,
    duffelOrderChangeId: confirmedParsed.id,
  });

  return {
    id: change.id,
    status: "confirmed",
    duffel_order_change_id: confirmedParsed.id,
    change_total_amount: confirmedParsed.change_total_amount,
    change_total_currency: confirmedParsed.change_total_currency,
    confirmed_at: confirmedParsed.confirmed_at ?? new Date().toISOString(),
    needs_payment: needsPayment,
  };
}

/** Backfill booking total / order_raw when a change was confirmed before totals were synced. */
export async function reconcileFlightBookingTotalFromConfirmedChange(
  bookingId: string,
): Promise<void> {
  const row = await bookingRepository.findById(bookingId);
  if (!row?.flightBooking?.duffel_order_id) return;

  const change = await prisma.flightOrderChange.findFirst({
    where: { flight_booking_id: row.flightBooking.id, status: "confirmed" },
    orderBy: { confirmed_at: "desc" },
  });
  if (!change?.raw) return;

  const quoteRaw = unwrap(change.raw);
  const offerId =
    typeof quoteRaw._confirmed_offer_id === "string"
      ? quoteRaw._confirmed_offer_id
      : null;
  let newTripTotal = offerId
    ? findOrderChangeOfferNewTotal(change.raw, offerId)
    : null;
  if (!newTripTotal && change.change_amount && change.change_currency) {
    const base = Number.parseFloat(String(row.total_amount));
    const delta = Number.parseFloat(change.change_amount);
    if (Number.isFinite(base) && Number.isFinite(delta)) {
      newTripTotal = {
        amount: (base + delta).toFixed(2),
        currency: change.change_currency,
      };
    }
  }
  if (!newTripTotal) return;

  const current = row.total_amount?.toString();
  if (current === newTripTotal.amount) return;

  const orderRaw = row.flightBooking.order_raw;
  await prisma.flightBooking.update({
    where: { id: row.flightBooking.id },
    data: {
      order_raw: patchDuffelOrderRawTotal(
        orderRaw,
        newTripTotal.amount,
        newTripTotal.currency,
      ) as unknown as Prisma.InputJsonValue,
      last_offer_total_amount: new Prisma.Decimal(newTripTotal.amount),
      last_offer_total_currency: newTripTotal.currency,
    },
  });
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      total_amount: new Prisma.Decimal(newTripTotal.amount),
      currency: newTripTotal.currency,
    },
  });
}

export async function listOrderChangesForBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}): Promise<
  Array<{
    id: string;
    source: string;
    status: string;
    duffel_order_change_request_id: string | null;
    duffel_order_change_id: string | null;
    change_amount: string | null;
    change_currency: string | null;
    quote_expires_at: string | null;
    confirmed_at: string | null;
    created_at: string;
  }>
> {
  const row = await loadChangeableBooking(input);
  if (!row.flightBooking) return [];
  const rows = await prisma.flightOrderChange.findMany({
    where: { flight_booking_id: row.flightBooking.id },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    duffel_order_change_request_id: r.duffel_order_change_request_id,
    duffel_order_change_id: r.duffel_order_change_id,
    change_amount: r.change_amount,
    change_currency: r.change_currency,
    quote_expires_at: r.quote_expires_at?.toISOString() ?? null,
    confirmed_at: r.confirmed_at?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
  }));
}
