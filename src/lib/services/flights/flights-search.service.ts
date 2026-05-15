import "server-only";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { createOfferRequest } from "@/lib/duffel/offer-requests";
import { mapDuffelOfferToDto, type FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  normalizeDuffelCode,
  type FlightSearchBody,
} from "@/lib/validations/flights.schema";
import { sliceDurationMinutes } from "@/lib/flights/duration";
import { passengersToDuffelOfferRequest } from "@/lib/flights/passengers";

type OfferRequestResponse = {
  data?: {
    id?: string;
    offers?: unknown[];
  };
};

function paramsHash(body: FlightSearchBody): string {
  const canonical = {
    slices: body.slices.map((s) => ({
      origin: normalizeDuffelCode(s.origin),
      destination: normalizeDuffelCode(s.destination),
      departure_date: s.departure_date,
      departure_time: s.departure_time ?? null,
      arrival_time: s.arrival_time ?? null,
    })),
    passengers: body.passengers,
    cabin_class: body.cabin_class,
    max_connections: body.max_connections ?? null,
    supplier_timeout_ms: body.supplier_timeout_ms ?? null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function firstCarrierIata(offer: FlightOfferDTO): string | null {
  const seg = offer.slices[0]?.segments[0];
  return seg?.marketing_carrier_iata ?? seg?.operating_carrier_iata ?? null;
}

function maxStopsOffer(offer: FlightOfferDTO): number {
  return offer.slices.reduce((m, s) => Math.max(m, s.stops_count), 0);
}

function totalDurationMinutes(offer: FlightOfferDTO): number {
  return offer.slices.reduce((acc, s) => acc + sliceDurationMinutes(s.segments), 0);
}

function applyFiltersAndSort(
  offers: FlightOfferDTO[],
  body: FlightSearchBody,
): FlightOfferDTO[] {
  let list = [...offers];

  if (body.max_price) {
    const cap = parseFloat(body.max_price);
    if (!Number.isNaN(cap)) {
      list = list.filter((o) => parseFloat(o.total_amount) <= cap);
    }
  }

  if (body.carrier_iata?.length) {
    const set = new Set(body.carrier_iata.map((c) => c.toUpperCase()));
    list = list.filter((o) => {
      const c = firstCarrierIata(o);
      return c && set.has(c);
    });
  }

  if (body.max_stops != null) {
    list = list.filter((o) => maxStopsOffer(o) <= body.max_stops!);
  }

  switch (body.sort) {
    case "price_asc":
      list.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
      break;
    case "price_desc":
      list.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
      break;
    case "duration_asc":
      list.sort((a, b) => totalDurationMinutes(a) - totalDurationMinutes(b));
      break;
    case "duration_desc":
      list.sort((a, b) => totalDurationMinutes(b) - totalDurationMinutes(a));
      break;
    default:
      break;
  }

  return list.slice(0, body.limit);
}

export async function runFlightSearch(
  body: FlightSearchBody,
  options: { userId: string | null },
) {
  const slices = body.slices.map((s) => {
    const row: Record<string, unknown> = {
      origin: normalizeDuffelCode(s.origin),
      destination: normalizeDuffelCode(s.destination),
      departure_date: s.departure_date,
    };
    if (s.departure_time) row.departure_time = s.departure_time;
    if (s.arrival_time) row.arrival_time = s.arrival_time;
    return row;
  });

  const duffelPayload: Record<string, unknown> = {
    slices,
    passengers: passengersToDuffelOfferRequest(body.passengers),
    cabin_class: body.cabin_class,
  };
  if (body.max_connections != null) {
    duffelPayload.max_connections = body.max_connections;
  }

  const raw = (await createOfferRequest(duffelPayload, {
    supplier_timeout_ms: body.supplier_timeout_ms,
  })) as OfferRequestResponse;
  const orqId = raw?.data?.id;
  const rawOffers = raw?.data?.offers;
  if (typeof orqId !== "string") {
    throw new AppError(
      502,
      "Flight search supplier returned an invalid response.",
      "UPSTREAM_ERROR",
    );
  }
  if (!Array.isArray(rawOffers)) {
    throw new AppError(
      502,
      "Flight search supplier returned an invalid response.",
      "UPSTREAM_ERROR",
    );
  }

  const offers: FlightOfferDTO[] = [];
  for (const item of rawOffers) {
    try {
      offers.push(mapDuffelOfferToDto(item));
    } catch {
      // skip malformed partial rows
    }
  }

  const filtered = applyFiltersAndSort(offers, body);
  const hash = paramsHash(body);
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000);

  // Only link sessions to app `users` rows. Supabase auth without a `public.users` profile would violate FK (P2003).
  let sessionUserId: string | null = null;
  if (options.userId) {
    const profile = await prisma.user.findUnique({
      where: { id: options.userId },
      select: { id: true },
    });
    if (profile) sessionUserId = profile.id;
  }

  const session = await prisma.flightSearchSession.create({
    data: {
      user_id: sessionUserId,
      offer_request_id: orqId,
      params_hash: hash,
      params_json: body,
      expires_at: expiresAt,
    },
  });

  return {
    search_session_id: session.id,
    offer_request_id: orqId,
    offers: filtered,
    meta: {
      total_offers_before_filter: offers.length,
      total_offers_returned: filtered.length,
      sort: body.sort,
      limit: body.limit,
    },
  };
}
