import "server-only";

import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import {
  confirmOrderChange,
  createOrderChange,
  createOrderChangeRequest,
} from "@/lib/duffel/order-changes";
import { DuffelApiError } from "@/lib/duffel/errors";
import { prisma } from "@/lib/prisma";
import type {
  FlightOrderChangeConfirmBody,
  FlightOrderChangeQuoteBody,
} from "@/lib/validations/flight-order-change.schema";

/**
 * Phase 1: voluntary order changes (exchange) for confirmed flight bookings.
 *
 *  - `requestQuote` calls Duffel `POST /air/order_change_requests` and returns
 *    the available offers (`oce_*`). We persist the quote envelope so the
 *    user can come back later before the quote expires.
 *  - `confirmChange` picks one of the offers via Duffel `POST /air/order_changes`
 *    and (when no airline-required confirm-action is pending) marks the local
 *    row `confirmed`. Paying a positive price delta via Duffel Payments is
 *    Phase 2 — for now we reject confirmations where `change_total_amount > 0`
 *    so the customer is never charged silently.
 *
 * Auth: same rules as cancel — `bookings:manage` or owner + `bookings:cancel_own`.
 */

export function assertCanChangeFlightBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingUserId: string | null;
}): void {
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

function unwrap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const data = (raw as { data?: unknown }).data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : (raw as Record<string, unknown>);
}

type ParsedOrderChangeRequest = {
  id: string;
  expires_at: string | null;
  order_change_offers: Array<{
    id: string;
    change_total_amount: string | null;
    change_total_currency: string | null;
    new_total_amount: string | null;
    new_total_currency: string | null;
    penalty_total_amount: string | null;
    penalty_total_currency: string | null;
    expires_at: string | null;
  }>;
};

function parseOrderChangeRequest(raw: unknown): ParsedOrderChangeRequest {
  const data = unwrap(raw);
  const id = typeof data.id === "string" ? data.id : null;
  if (!id) {
    throw new AppError(
      502,
      "Order change supplier returned an invalid response.",
      "UPSTREAM_ERROR",
    );
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
      expires_at: typeof o.expires_at === "string" ? o.expires_at : null,
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
  needs_confirm: boolean;
};

function parseOrderChange(raw: unknown): ParsedOrderChange {
  const data = unwrap(raw);
  const id = typeof data.id === "string" ? data.id : null;
  if (!id) {
    throw new AppError(
      502,
      "Order change supplier returned an invalid response.",
      "UPSTREAM_ERROR",
    );
  }
  return {
    id,
    confirmed_at: typeof data.confirmed_at === "string" ? data.confirmed_at : null,
    change_total_amount:
      typeof data.change_total_amount === "string" ? data.change_total_amount : null,
    change_total_currency:
      typeof data.change_total_currency === "string" ? data.change_total_currency : null,
    needs_confirm:
      typeof data.live_mode === "boolean" && typeof data.confirmed_at !== "string",
  };
}

async function logChangeEvent(input: {
  type: "change_quoted" | "change_confirmed";
  bookingId: string;
  amount?: string | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await bookingFinancialEventRepository.record({
      type: input.type,
      booking_id: input.bookingId,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort
  }
}

export type OrderChangeQuoteResult = {
  id: string;
  status: string;
  duffel_order_change_request_id: string;
  quote_expires_at: string | null;
  offers: ParsedOrderChangeRequest["order_change_offers"];
};

export async function requestOrderChangeQuote(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
  body: FlightOrderChangeQuoteBody;
}): Promise<OrderChangeQuoteResult> {
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) {
    throw new AppError(404, "Booking not found.", "NOT_FOUND");
  }
  assertCanChangeFlightBooking({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });
  if (row.type !== "flight" || !row.flightBooking) {
    throw new AppError(400, "Only flight bookings support changes.", "VALIDATION_ERROR");
  }
  if (row.status !== "confirmed") {
    throw new AppError(
      409,
      "Only confirmed bookings can be changed.",
      "BOOKING_NOT_CHANGEABLE",
    );
  }
  const orderId = row.flightBooking.duffel_order_id;
  if (!orderId) {
    throw new AppError(400, "This booking has no Duffel order.", "VALIDATION_ERROR");
  }

  let raw: unknown;
  try {
    raw = await createOrderChangeRequest({
      orderId,
      slices: input.body.slices,
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

  const persisted = await prisma.flightOrderChange.create({
    data: {
      flight_booking_id: row.flightBooking.id,
      source: "user",
      duffel_order_change_request_id: parsed.id,
      status: "quoted",
      quote_expires_at: validExpiresAt,
      raw: raw as unknown as Prisma.InputJsonValue,
    },
  });

  await logChangeEvent({
    type: "change_quoted",
    bookingId: row.id,
    payload: {
      duffel_order_change_request_id: parsed.id,
      offer_count: parsed.order_change_offers.length,
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
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) {
    throw new AppError(404, "Booking not found.", "NOT_FOUND");
  }
  assertCanChangeFlightBooking({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });
  if (row.type !== "flight" || !row.flightBooking) {
    throw new AppError(400, "Only flight bookings support changes.", "VALIDATION_ERROR");
  }
  const change = await prisma.flightOrderChange.findFirst({
    where: {
      id: input.orderChangeId,
      flight_booking_id: row.flightBooking.id,
    },
  });
  if (!change) {
    throw new AppError(404, "Order change not found for this booking.", "NOT_FOUND");
  }
  if (change.status !== "quoted") {
    throw new AppError(
      409,
      "This change quote is no longer valid.",
      "ORDER_CHANGE_INVALID",
    );
  }
  if (change.quote_expires_at && change.quote_expires_at < new Date()) {
    await prisma.flightOrderChange.update({
      where: { id: change.id },
      data: { status: "expired" },
    });
    throw new AppError(410, "Order change quote expired.", "QUOTE_EXPIRED");
  }

  let raw: unknown;
  try {
    raw = await createOrderChange(input.body.order_change_offer_id);
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

  const parsed = parseOrderChange(raw);
  const changeTotal = Number.parseFloat(parsed.change_total_amount ?? "0");
  /** Phase 2: pay positive deltas via a Duffel PaymentIntent before confirming. */
  const needsPayment = Number.isFinite(changeTotal) && changeTotal > 0;
  if (needsPayment) {
    await prisma.flightOrderChange.update({
      where: { id: change.id },
      data: {
        duffel_order_change_id: parsed.id,
        change_amount: parsed.change_total_amount,
        change_currency: parsed.change_total_currency,
        raw: raw as unknown as Prisma.InputJsonValue,
        status: "failed",
      },
    });
    throw new AppError(
      501,
      "Paid order changes are not yet supported.",
      "PAID_ORDER_CHANGE_UNAVAILABLE",
    );
  }

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

  await prisma.flightOrderChange.update({
    where: { id: change.id },
    data: {
      duffel_order_change_id: parsed.id,
      change_amount: parsed.change_total_amount,
      change_currency: parsed.change_total_currency,
      confirmed_at: parsed.confirmed_at ? new Date(parsed.confirmed_at) : new Date(),
      status: "confirmed",
      raw: raw as unknown as Prisma.InputJsonValue,
    },
  });

  await logChangeEvent({
    type: "change_confirmed",
    bookingId: row.id,
    amount: parsed.change_total_amount,
    currency: parsed.change_total_currency,
    payload: {
      duffel_order_change_id: parsed.id,
      duffel_order_change_request_id: change.duffel_order_change_request_id,
    },
  });

  return {
    id: change.id,
    status: "confirmed",
    duffel_order_change_id: parsed.id,
    change_total_amount: parsed.change_total_amount,
    change_total_currency: parsed.change_total_currency,
    confirmed_at: parsed.confirmed_at ?? new Date().toISOString(),
    needs_payment: false,
  };
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
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) throw new AppError(404, "Booking not found.", "NOT_FOUND");
  assertCanChangeFlightBooking({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });
  if (row.type !== "flight" || !row.flightBooking) return [];
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
