import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { StaysRatesPayload } from "@/lib/api/stays-dto";
import {
  flightTravelDatesFromOffer,
  travelersFromFlightOffer,
} from "@/lib/bookings/booking-sidebar-context";
import type { JourneyProductType } from "@/lib/constants/customer-journey";

export const JOURNEY_SNAPSHOT_VERSION = 1;

export type JourneyTripType = "one_way" | "round_trip" | "multi_city";

export type JourneyTripSnapshot = {
  version: number;
  product_type: JourneyProductType;
  product_ref: string;
  origin_code?: string;
  origin_label?: string;
  destination_code?: string;
  destination_label?: string;
  start_date?: string;
  end_date?: string;
  trip_type?: JourneyTripType;
  adults?: number;
  children?: number;
  infants?: number;
  rooms?: number;
  cabin_class?: string;
  airline?: string;
  hotel_name?: string;
  location_label?: string;
  room_name?: string;
  nights?: number;
  price_amount?: string;
  price_currency?: string;
  detail_path?: string;
  search_session_id?: string;
  quote_id?: string;
  offer_expires_at?: string;
};

function ymdFromIso(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const d = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, d);
}

function formatStaysLocation(loc: StaysRatesPayload["accommodation"]["location"]): string {
  const city = loc.city?.trim();
  const cc = loc.country_code?.trim()?.toUpperCase();
  if (!city && !cc) return "";
  if (city && cc) return `${city}, ${cc}`;
  return city || cc || "";
}

export function formatTravelersSummary(snapshot: Pick<
  JourneyTripSnapshot,
  "adults" | "children" | "infants" | "rooms"
>): string {
  const parts: string[] = [];
  const adults = snapshot.adults ?? 0;
  const children = snapshot.children ?? 0;
  const infants = snapshot.infants ?? 0;
  const rooms = snapshot.rooms ?? 0;

  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  if (infants > 0) parts.push(`${infants} infant${infants === 1 ? "" : "s"}`);
  if (rooms > 0) parts.push(`${rooms} room${rooms === 1 ? "" : "s"}`);
  return parts.join(", ") || "—";
}

export function formatRouteLabel(snapshot: Pick<
  JourneyTripSnapshot,
  "origin_label" | "destination_label" | "hotel_name" | "location_label" | "product_type"
>): string {
  if (snapshot.product_type === "hotel") {
    const name = snapshot.hotel_name?.trim();
    const loc = snapshot.location_label?.trim();
    if (name && loc) return `${name} (${loc})`;
    return name || loc || "—";
  }
  const o = snapshot.origin_label?.trim();
  const d = snapshot.destination_label?.trim();
  if (o && d) return `${o} → ${d}`;
  return o || d || "—";
}

export function inferFlightTripType(offer: FlightOfferDTO): JourneyTripType {
  const n = offer.slices.length;
  if (n >= 3) return "multi_city";
  if (n >= 2) return "round_trip";
  return "one_way";
}

export function buildFlightTripSnapshot(
  offer: FlightOfferDTO,
  opts: {
    productRef: string;
    searchSessionId?: string | null;
    detailPath?: string;
    searchParamsPatch?: Partial<JourneyTripSnapshot>;
  },
): JourneyTripSnapshot {
  const slice0 = offer.slices[0];
  const slice1 = offer.slices[1];
  const seg0 = slice0?.segments[0];
  const lastSeg0 = slice0?.segments[slice0.segments.length - 1];
  const dates = flightTravelDatesFromOffer(offer);
  const travelers = travelersFromFlightOffer(offer);

  const snapshot: JourneyTripSnapshot = {
    version: JOURNEY_SNAPSHOT_VERSION,
    product_type: "flight",
    product_ref: opts.productRef,
    origin_code: slice0?.origin_iata || seg0?.origin_iata || undefined,
    origin_label: seg0?.origin_name || slice0?.origin_iata || undefined,
    destination_code: slice0?.destination_iata || lastSeg0?.destination_iata || undefined,
    destination_label: lastSeg0?.destination_name || slice0?.destination_iata || undefined,
    start_date: dates.checkIn || undefined,
    end_date: dates.checkOut || undefined,
    trip_type: inferFlightTripType(offer),
    adults: travelers.adults,
    children: travelers.children,
    infants: travelers.infants,
    cabin_class: seg0?.cabin_class ?? undefined,
    airline: seg0?.marketing_carrier_name ?? undefined,
    price_amount: offer.total_amount,
    price_currency: offer.total_currency,
    detail_path: opts.detailPath,
    search_session_id: opts.searchSessionId?.trim() || undefined,
    offer_expires_at: offer.expires_at ?? undefined,
  };

  if (slice1) {
    const retSeg = slice1.segments[0];
    if (retSeg?.departing_at) {
      snapshot.end_date = ymdFromIso(retSeg.departing_at) || snapshot.end_date;
    }
  }

  return mergeTripSnapshots(snapshot, opts.searchParamsPatch ?? null);
}

export function buildHotelTripSnapshotFromRates(
  payload: StaysRatesPayload,
  opts: {
    productRef: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    rooms?: number;
    destinationLabel?: string;
    detailPath?: string;
    quoteId?: string;
    roomName?: string;
    priceAmount?: string;
    priceCurrency?: string;
  },
): JourneyTripSnapshot {
  const checkIn = opts.checkIn?.trim() || "";
  const checkOut = opts.checkOut?.trim() || "";
  const loc = formatStaysLocation(payload.accommodation.location);
  const cheapest = payload.rates[0];

  return {
    version: JOURNEY_SNAPSHOT_VERSION,
    product_type: "hotel",
    product_ref: opts.productRef,
    hotel_name: payload.accommodation.name,
    location_label: opts.destinationLabel?.trim() || loc || undefined,
    start_date: checkIn || undefined,
    end_date: checkOut || undefined,
    adults: opts.adults,
    children: opts.children,
    rooms: opts.rooms,
    room_name: opts.roomName ?? cheapest?.room_name ?? undefined,
    nights: checkIn && checkOut ? nightsBetween(checkIn, checkOut) : undefined,
    price_amount: opts.priceAmount ?? cheapest?.total_amount ?? undefined,
    price_currency: opts.priceCurrency ?? cheapest?.total_currency ?? undefined,
    detail_path: opts.detailPath,
    quote_id: opts.quoteId,
  };
}

export function buildMinimalHotelSnapshot(opts: {
  productRef: string;
  detailPath?: string;
  hotelName?: string;
  locationLabel?: string;
}): JourneyTripSnapshot {
  return {
    version: JOURNEY_SNAPSHOT_VERSION,
    product_type: "hotel",
    product_ref: opts.productRef,
    hotel_name: opts.hotelName,
    location_label: opts.locationLabel,
    detail_path: opts.detailPath,
  };
}

/** Merge snapshots: patch fills gaps; never overwrites existing non-empty values with empty. */
export function mergeTripSnapshots(
  base: JourneyTripSnapshot | Record<string, unknown> | null | undefined,
  patch: Partial<JourneyTripSnapshot> | Record<string, unknown> | null | undefined,
): JourneyTripSnapshot {
  const out: Record<string, unknown> = {
    ...(base && typeof base === "object" ? base : {}),
  };

  if (!patch || typeof patch !== "object") {
    return out as JourneyTripSnapshot;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (typeof value === "number" && Number.isNaN(value)) continue;
    const existing = out[key];
    if (existing !== undefined && existing !== null && existing !== "") continue;
    out[key] = value;
  }

  if (!out.version) out.version = JOURNEY_SNAPSHOT_VERSION;
  return out as JourneyTripSnapshot;
}

export function parseTripSnapshot(raw: unknown): JourneyTripSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.product_ref !== "string" || !o.product_ref.trim()) return null;
  if (o.product_type !== "flight" && o.product_type !== "hotel" && o.product_type !== "car") {
    return null;
  }
  return mergeTripSnapshots(null, o as Partial<JourneyTripSnapshot>);
}

export function formatOutreachSummary(
  snapshot: JourneyTripSnapshot | null,
  stage: string,
): string {
  if (!snapshot) {
    return `Customer stopped at ${stage.replace(/_/g, " ")}. Trip details unavailable.`;
  }

  const stageLabel = stage.replace(/_/g, " ");
  const travelers = formatTravelersSummary(snapshot);
  const price =
    snapshot.price_amount && snapshot.price_currency
      ? `${snapshot.price_amount} ${snapshot.price_currency}`
      : null;

  if (snapshot.product_type === "flight") {
    const route = formatRouteLabel(snapshot);
    const dates =
      snapshot.start_date && snapshot.end_date && snapshot.start_date !== snapshot.end_date
        ? `${snapshot.start_date} to ${snapshot.end_date}`
        : snapshot.start_date || "dates unknown";
    const trip = snapshot.trip_type?.replace(/_/g, " ") ?? "flight";
    const parts = [
      `Customer viewed a ${trip} (${route}) departing ${dates}.`,
      `Party: ${travelers}.`,
      price ? `Quoted price: ${price}.` : null,
      snapshot.airline ? `Airline: ${snapshot.airline}.` : null,
      `Last funnel stage: ${stageLabel}.`,
    ];
    return parts.filter(Boolean).join(" ");
  }

  const hotel = snapshot.hotel_name || "Hotel";
  const loc = snapshot.location_label ? ` in ${snapshot.location_label}` : "";
  const dates =
    snapshot.start_date && snapshot.end_date
      ? `Stay ${snapshot.start_date} to ${snapshot.end_date}`
      : "Stay dates unknown";
  const parts = [
    `Customer viewed ${hotel}${loc}.`,
    `${dates} (${snapshot.nights ?? "?"} night${snapshot.nights === 1 ? "" : "s"}).`,
    `Party: ${travelers}.`,
    snapshot.room_name ? `Room: ${snapshot.room_name}.` : null,
    price ? `Quoted price: ${price}.` : null,
    `Last funnel stage: ${stageLabel}.`,
  ];
  return parts.filter(Boolean).join(" ");
}
