"use client";

import { stableFlightSearchBodyKey } from "../flights/flight-search-body-stable";
import { apiJson } from "@/lib/http/api-client";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightSearchBody } from "@/lib/validations/flights.schema";
import type {
  FlightCheckoutBookingBody,
  FlightCheckoutValidateBody,
} from "@/lib/validations/flight-checkout.schema";
import type { FlightOrderServiceLine } from "@/lib/validations/flight-ancillaries.schema";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";

import type { SearchPassengerAgeContext } from "@/lib/flights/passenger-age-rules";

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

export async function getFlightSearchSessionParams(sessionId: string): Promise<{
  passengers: SearchPassengerAgeContext[] | null;
  expires_at: string;
}> {
  return apiJson<{ passengers: SearchPassengerAgeContext[] | null; expires_at: string }>(
    `${FLIGHTS_V1_BASE}/search-sessions/${encodeURIComponent(sessionId)}/params`,
  );
}

export type FlightBookingValidateResult = {
  valid: boolean;
  issues: Array<{
    path: (string | number)[];
    code: string;
    values: Record<string, unknown> | null;
  }>;
};

export async function postFlightBookingValidate(
  body: FlightCheckoutValidateBody,
): Promise<FlightBookingValidateResult> {
  return apiJson<FlightBookingValidateResult>(`${FLIGHTS_V1_BASE}/bookings/validate`, {
    method: "POST",
    body,
  });
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

export async function getFlightAirports(
  params: {
    q?: string;
    limit?: number;
  },
  init?: { signal?: AbortSignal },
): Promise<{ airports: AirportSuggestionDto[] }> {
  const p = new URLSearchParams();
  if (params.q?.trim()) p.set("q", params.q.trim());
  if (params.limit != null) p.set("limit", String(params.limit));
  const qs = p.toString();
  return apiJson<{ airports: AirportSuggestionDto[] }>(
    `${FLIGHTS_V1_BASE}/airports${qs ? `?${qs}` : ""}`,
    { signal: init?.signal },
  );
}

export async function getFlightOffer(offerId: string): Promise<{ offer: FlightOfferDTO }> {
  return apiJson<{ offer: FlightOfferDTO }>(
    `${FLIGHTS_V1_BASE}/offers/${encodeURIComponent(offerId)}`,
  );
}

const OFFER_CACHE_TTL_MS = 60_000;
const inflightOfferGet = new Map<string, Promise<{ offer: FlightOfferDTO }>>();
const offerResultCache = new Map<string, { at: number; data: { offer: FlightOfferDTO } }>();

/** Coalesces concurrent offer GETs and caches results briefly. */
export function getFlightOfferDeduped(offerId: string): Promise<{ offer: FlightOfferDTO }> {
  const key = offerId.trim();
  const cached = offerResultCache.get(key);
  if (cached && Date.now() - cached.at < OFFER_CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  let p = inflightOfferGet.get(key);
  if (!p) {
    p = getFlightOffer(key)
      .then((data) => {
        offerResultCache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        inflightOfferGet.delete(key);
      });
    inflightOfferGet.set(key, p);
  }
  return p;
}

export async function getFlightSeatMaps(
  offerId: string,
): Promise<{ offer_id: string; seat_maps: SeatMapDTO[] }> {
  return apiJson<{ offer_id: string; seat_maps: SeatMapDTO[] }>(
    `${FLIGHTS_V1_BASE}/offers/${encodeURIComponent(offerId)}/seat-maps`,
  );
}

const inflightSeatMapsGet = new Map<
  string,
  Promise<{ offer_id: string; seat_maps: SeatMapDTO[] }>
>();

function seatMapsStorageKey(offerId: string): string {
  return `seatMaps:${offerId.trim()}`;
}

function readSeatMapsCache(offerId: string): SeatMapDTO[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(seatMapsStorageKey(offerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; seat_maps: SeatMapDTO[] };
    if (!parsed?.seat_maps || Date.now() - parsed.at > OFFER_CACHE_TTL_MS) return null;
    return parsed.seat_maps;
  } catch {
    return null;
  }
}

function writeSeatMapsCache(offerId: string, seat_maps: SeatMapDTO[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      seatMapsStorageKey(offerId),
      JSON.stringify({ at: Date.now(), seat_maps }),
    );
  } catch {
    /* ignore */
  }
}

/** Coalesces concurrent seat-map GETs; caches in sessionStorage briefly. */
export function getFlightSeatMapsDeduped(
  offerId: string,
): Promise<{ offer_id: string; seat_maps: SeatMapDTO[] }> {
  const key = offerId.trim();
  const cached = readSeatMapsCache(key);
  if (cached) {
    return Promise.resolve({ offer_id: key, seat_maps: cached });
  }
  let p = inflightSeatMapsGet.get(key);
  if (!p) {
    p = getFlightSeatMaps(key)
      .then((data) => {
        writeSeatMapsCache(key, data.seat_maps);
        return data;
      })
      .finally(() => {
        inflightSeatMapsGet.delete(key);
      });
    inflightSeatMapsGet.set(key, p);
  }
  return p;
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

export type FlightOrderChangeSliceOption = {
  slice_id: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  cabin_class: string | null;
  label: string;
};

export type FlightOrderChangeContextResult = {
  booking_id: string;
  duffel_order_id: string;
  slices: FlightOrderChangeSliceOption[];
  changeable: boolean;
  change_allowed: boolean;
  change_policy_message: string;
};

export type FlightOrderChangeOffer = {
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
  slices?: {
    add?: unknown[];
    remove?: unknown[];
  } | null;
};

export type FlightOrderChangeRow = {
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
};

export type FlightOrderChangeQuoteBody =
  | {
      slices: {
        add?: Array<{
          origin: string;
          destination: string;
          departure_date: string;
          cabin_class?: string;
        }>;
        remove?: Array<{ slice_id: string }>;
      };
    }
  | {
      selected_slice_id: string;
      departure_date: string;
      origin?: string;
      destination?: string;
      cabin_class?: "economy" | "premium_economy" | "business" | "first";
    };

export async function getFlightOrderChangeContext(
  bookingId: string,
): Promise<FlightOrderChangeContextResult> {
  return apiJson<FlightOrderChangeContextResult>(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/order-changes/context`,
  );
}

export async function listFlightOrderChanges(bookingId: string): Promise<{
  booking_id: string;
  order_changes: FlightOrderChangeRow[];
}> {
  return apiJson<{ booking_id: string; order_changes: FlightOrderChangeRow[] }>(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/order-changes`,
  );
}

export async function postFlightOrderChangeQuote(
  bookingId: string,
  body: FlightOrderChangeQuoteBody,
): Promise<{
  id: string;
  status: string;
  duffel_order_change_request_id: string;
  quote_expires_at: string | null;
  offers: FlightOrderChangeOffer[];
}> {
  return apiJson(`${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/order-changes`, {
    method: "POST",
    body,
  });
}

export async function postFlightOrderChangePaymentIntent(
  bookingId: string,
  changeId: string,
  body: { order_change_offer_id: string },
): Promise<{
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
  return apiJson(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/order-changes/${encodeURIComponent(changeId)}/payment-intent`,
    { method: "POST", body },
  );
}

export async function postFlightOrderChangeConfirm(
  bookingId: string,
  changeId: string,
  body: { order_change_offer_id: string; payment_intent_id?: string },
): Promise<{
  id: string;
  status: string;
  duffel_order_change_id: string;
  change_total_amount: string | null;
  change_total_currency: string | null;
  confirmed_at: string | null;
  needs_payment: boolean;
}> {
  return apiJson(
    `${FLIGHTS_V1_BASE}/bookings/${encodeURIComponent(bookingId)}/order-changes/${encodeURIComponent(changeId)}/confirm`,
    { method: "POST", body },
  );
}
