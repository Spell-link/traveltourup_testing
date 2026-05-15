"use client";

import { stableFlightSearchBodyKey } from "../flights/flight-search-body-stable";
import { apiJson } from "@/lib/http/api-client";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightSearchBody } from "@/lib/validations/flights.schema";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";
import type { FlightOrderServiceLine } from "@/lib/validations/flight-ancillaries.schema";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";

export const FLIGHTS_V1_BASE = "/api/v1/flights";

export type FlightSearchMeta = {
  total_offers_before_filter: number;
  total_offers_returned: number;
  sort: string;
  limit: number;
};

export type FlightSearchApiResult = {
  search_session_id: string;
  offer_request_id: string;
  offers: FlightOfferDTO[];
  meta: FlightSearchMeta;
};

export async function postFlightSearch(body: FlightSearchBody): Promise<FlightSearchApiResult> {
  return apiJson<FlightSearchApiResult>(`${FLIGHTS_V1_BASE}/search`, { method: "POST", body });
}

export async function getFlightSearchSessionOffers(sessionId: string): Promise<{
  offers: FlightOfferDTO[];
  expires_at: string;
}> {
  return apiJson<{ offers: FlightOfferDTO[]; expires_at: string }>(
    `${FLIGHTS_V1_BASE}/search-sessions/${encodeURIComponent(sessionId)}`,
  );
}

const inflightSearchPost = new Map<string, Promise<FlightSearchApiResult>>();
const inflightSessionGet = new Map<string, Promise<{ offers: FlightOfferDTO[]; expires_at: string }>>();

/** Coalesces concurrent identical searches (e.g. React Strict Mode double mount). */
export function postFlightSearchDeduped(body: FlightSearchBody): Promise<FlightSearchApiResult> {
  const key = stableFlightSearchBodyKey(body);
  let p = inflightSearchPost.get(key);
  if (!p) {
    p = postFlightSearch(body).finally(() => {
      inflightSearchPost.delete(key);
    });
    inflightSearchPost.set(key, p);
  }
  return p;
}

/** Coalesces concurrent GETs for the same flight search session id. */
export function getFlightSearchSessionOffersDeduped(sessionId: string): Promise<{
  offers: FlightOfferDTO[];
  expires_at: string;
}> {
  const key = sessionId.trim();
  let p = inflightSessionGet.get(key);
  if (!p) {
    p = getFlightSearchSessionOffers(key).finally(() => {
      inflightSessionGet.delete(key);
    });
    inflightSessionGet.set(key, p);
  }
  return p;
}

export type AirportSuggestionDto = {
  iata_code: string;
  name: string;
  city_name?: string;
};

export async function getFlightAirports(params: {
  q?: string;
  limit?: number;
}): Promise<{ airports: AirportSuggestionDto[] }> {
  const p = new URLSearchParams();
  if (params.q?.trim()) p.set("q", params.q.trim());
  if (params.limit != null) p.set("limit", String(params.limit));
  const qs = p.toString();
  return apiJson<{ airports: AirportSuggestionDto[] }>(
    `${FLIGHTS_V1_BASE}/airports${qs ? `?${qs}` : ""}`,
  );
}

export async function getFlightOffer(offerId: string): Promise<{ offer: FlightOfferDTO }> {
  return apiJson<{ offer: FlightOfferDTO }>(
    `${FLIGHTS_V1_BASE}/offers/${encodeURIComponent(offerId)}`,
  );
}

export async function getFlightSeatMaps(
  offerId: string,
): Promise<{ offer_id: string; seat_maps: SeatMapDTO[] }> {
  return apiJson<{ offer_id: string; seat_maps: SeatMapDTO[] }>(
    `${FLIGHTS_V1_BASE}/offers/${encodeURIComponent(offerId)}/seat-maps`,
  );
}

export type FlightPaymentIntentApiResult = {
  payment_intent_id: string;
  client_token: string;
  status: string;
  offer_id: string;
  pricing: {
    offer_total: string;
    offer_currency: string;
    services_subtotal: string;
    commission_and_fees_markup: string;
    customer_charge_amount: string;
    customer_charge_currency: string;
  };
  idempotent_replay?: boolean;
  pricing_detail?: {
    subtotal_before_payment_fee: string;
    duffel_payments_fee_rate: number;
    fx_rate_applied: number;
  };
};

/** Create Duffel PaymentIntent (server refreshes offer and applies commission formula). */
export async function postFlightPaymentIntent(
  body: { offer_id: string; services?: FlightOrderServiceLine[] },
  idempotencyKey?: string,
): Promise<FlightPaymentIntentApiResult> {
  const headers: Record<string, string> = {};
  if (idempotencyKey?.trim()) {
    headers["Idempotency-Key"] = idempotencyKey.trim();
  }
  return apiJson<FlightPaymentIntentApiResult>(`${FLIGHTS_V1_BASE}/payment-intents`, {
    method: "POST",
    body: {
      offer_id: body.offer_id,
      services: body.services ?? [],
    },
    headers,
  });
}

/** Create Duffel instant order after PaymentIntent succeeded (requires auth + `bookings:create`). */
export async function postFlightBooking(
  body: FlightCheckoutBookingBody,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (idempotencyKey?.trim()) {
    headers["Idempotency-Key"] = idempotencyKey.trim();
  }
  return apiJson<Record<string, unknown>>(`${FLIGHTS_V1_BASE}/bookings`, {
    method: "POST",
    body,
    headers,
  });
}

export type FlightBookingCancelAction = { action: "quote" } | { action: "confirm"; order_cancellation_id: string };

export type FlightBookingCancelApiResult =
  | {
      action: "quote";
      order_cancellation: Record<string, unknown>;
    }
  | {
      action: "confirm";
      order_cancellation: Record<string, unknown>;
      booking: Record<string, unknown>;
    };

export async function postFlightBookingCancel(
  bookingId: string,
  body: FlightBookingCancelAction,
): Promise<FlightBookingCancelApiResult> {
  return apiJson<FlightBookingCancelApiResult>(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: "POST", body },
  );
}

export type FlightBookingCancelStatusResult = {
  booking_id: string;
  booking_status: string;
  payment_status: string;
  order_cancellation: Record<string, unknown> | null;
  refund_attempt: Record<string, unknown> | null;
};

export async function getFlightBookingCancelStatus(bookingId: string): Promise<FlightBookingCancelStatusResult> {
  return apiJson<FlightBookingCancelStatusResult>(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/cancel/status`,
  );
}

export async function postFlightBookingRefundRetry(bookingId: string): Promise<{
  refund: Record<string, unknown>;
  booking: Record<string, unknown>;
}> {
  return apiJson<{ refund: Record<string, unknown>; booking: Record<string, unknown> }>(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/cancel/refund-retry`,
    { method: "POST" },
  );
}
