import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import { flightOfferToListDisplay } from "@/lib/flights/list-display";
import {
  parseOrderItineraryFromSnapshot,
  type OrderItinerarySegment,
} from "@/lib/flights/order-itinerary-display";

export function asFlightOffer(snapshot: unknown): FlightOfferDTO | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const o = snapshot as { slices?: unknown };
  if (!Array.isArray(o.slices)) return null;
  return snapshot as FlightOfferDTO;
}

function fmtTime24(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16) || "--:--";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function durationFromSegments(segments: OrderItinerarySegment[]): string {
  const first = segments[0]?.departing_at;
  const last = segments[segments.length - 1]?.arriving_at;
  if (!first || !last) return "—";
  const ms = new Date(last).getTime() - new Date(first).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function displayFromOrderSegments(
  segments: OrderItinerarySegment[],
  totalAmount: string | number,
  currency: string,
): FlightListDisplay | null {
  if (segments.length === 0) return null;
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  const stops = Math.max(0, segments.length - 1);
  const depDate = first.departing_at?.slice(0, 10) ?? "";
  const carrier = first.marketing_carrier_name ?? "Airline";
  const n = Number.parseFloat(String(totalAmount));
  const price = Number.isFinite(n) ? n : 0;

  return {
    id: "booking",
    airline: carrier,
    airlineCode: "—",
    airlineName: carrier,
    airlineLogoUrl: null,
    flightNumber: first.flight_number ? `${carrier} ${first.flight_number}` : "—",
    flightNumbersSearch: "",
    departureTime: fmtTime24(first.departing_at),
    arrivalTime: fmtTime24(last.arriving_at),
    duration: durationFromSegments(segments),
    durationMinutes: 0,
    stops,
    stopDetails: stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`,
    layoverSummary: "",
    price,
    currency: currency.toUpperCase(),
    departureAirport: first.origin_iata || "—",
    arrivalAirport: last.destination_iata || "—",
    departureDate: depDate,
    arrivalDateLabel: last.arriving_at?.slice(0, 10) ?? depDate,
    firstDepartingAt: first.departing_at,
    lastArrivingAt: last.arriving_at,
    amenities: ["wifi", "meals"],
    baggage: "See fare on airline site",
    refundable: false,
    rating: 4.5,
    reviews: 0,
    departureTerminal: first.origin_terminal ?? "—",
    arrivalTerminal: last.destination_terminal ?? "—",
    expires_at: null,
    fromCode: first.origin_iata,
    toCode: last.destination_iata,
    freeCancellation: false,
    seatSelection: false,
    segmentDetails: [],
    fareBrandName: first.cabin_class?.replace(/_/g, " ") ?? null,
  };
}

/** Map booking `itinerary_snapshot` to the same display shape as flight search detail. */
export function bookingSnapshotToFlightDisplay(
  snapshot: unknown,
  totalAmount: string | number,
  currency: string,
): { flight: FlightListDisplay; offer: FlightOfferDTO | null } | null {
  const offer = asFlightOffer(snapshot);
  if (offer) {
    const flight = flightOfferToListDisplay(offer);
    const n = Number.parseFloat(String(totalAmount));
    if (Number.isFinite(n)) {
      flight.price = n;
      flight.currency = (currency || flight.currency).toUpperCase();
    }
    return { flight, offer };
  }

  const slices = parseOrderItineraryFromSnapshot(snapshot);
  const segments = slices[0]?.segments ?? [];
  const flight = displayFromOrderSegments(segments, totalAmount, currency);
  if (!flight) return null;
  return { flight, offer: null };
}
