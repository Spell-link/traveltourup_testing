import { mapDuffelOfferToDto, type FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  flightOfferToListDisplayForSlice,
  type FlightListDisplay,
} from "@/lib/flights/list-display";
import { parseChangeDelta } from "@/lib/flights/flight-change-session";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";
import type { FlightChangeListDisplay } from "@/lib/flights/order-change-list-display";
import { firstAddedSlice } from "@/lib/flights/order-change-offer-slices";

function changeOfferPricing(offer: FlightOrderChangeOffer): {
  total_amount: string;
  total_currency: string;
} {
  const currency = (
    offer.change_total_currency ??
    offer.new_total_currency ??
    "USD"
  ).toUpperCase();
  const delta = parseChangeDelta(offer);
  return {
    total_amount: Math.abs(delta).toFixed(2),
    total_currency: currency,
  };
}

/**
 * Builds a synthetic {@link FlightOfferDTO} from a Duffel order change offer's `slices.add`.
 * Used to reuse FlightResultCard, FlightDetailContent, and BookingSidebar.
 */
export function orderChangeOfferToFlightOfferDto(offer: FlightOrderChangeOffer): FlightOfferDTO | null {
  let slices = offer.slices?.add;
  if (!slices?.length) {
    const single = firstAddedSlice(offer.slices);
    if (!single) return null;
    slices = [single];
  }
  if (slices.length === 0) return null;

  const { total_amount, total_currency } = changeOfferPricing(offer);

  try {
    return mapDuffelOfferToDto({
      id: offer.id,
      total_amount,
      total_currency,
      expires_at: offer.expires_at,
      live_mode: null,
      slices,
      passengers: [],
      available_services: [],
    });
  } catch {
    return null;
  }
}

export function orderChangeOfferToListDisplay(offer: FlightOrderChangeOffer): FlightChangeListDisplay {
  const delta = parseChangeDelta(offer);
  const currency = (offer.change_total_currency ?? offer.new_total_currency ?? "USD").toUpperCase();
  const dto = orderChangeOfferToFlightOfferDto(offer);

  if (dto && dto.slices.length > 0) {
    const flight = flightOfferToListDisplayForSlice(dto, 0);
    return {
      ...flight,
      price: Math.abs(delta),
      currency,
      changeOffer: offer,
      changeDelta: delta,
    };
  }

  const summary = offer.new_slice_summary ?? offer.itinerary_summary ?? "Change option";
  const routePart = offer.itinerary_summary?.split("·")[0]?.trim() ?? summary;
  const parts = routePart.split("→").map((s) => s.trim());
  const fromCode = parts[0]?.slice(0, 3).toUpperCase() ?? "—";
  const toCode = parts[1]?.slice(0, 3).toUpperCase() ?? "—";

  return {
    id: offer.id,
    airline: summary.split("·")[0]?.trim() || "Airline",
    airlineCode: "—",
    airlineName: null,
    airlineLogoUrl: null,
    flightNumber: summary,
    flightNumbersSearch: "",
    departureTime: "--:--",
    arrivalTime: "--:--",
    duration: "—",
    durationMinutes: 0,
    stops: 0,
    stopDetails: "See details",
    layoverSummary: "",
    price: Math.abs(delta),
    currency,
    departureAirport: fromCode,
    arrivalAirport: toCode,
    departureDate: "",
    arrivalDateLabel: "",
    firstDepartingAt: null,
    lastArrivingAt: null,
    amenities: [],
    baggage: "",
    refundable: false,
    rating: 0,
    reviews: 0,
    departureTerminal: "—",
    arrivalTerminal: "—",
    expires_at: offer.expires_at,
    fromCode,
    toCode,
    freeCancellation: false,
    seatSelection: false,
    segmentDetails: [],
    fareBrandName: null,
    changeOffer: offer,
    changeDelta: delta,
  };
}

export function orderChangeOffersToListDisplay(
  offers: FlightOrderChangeOffer[],
): FlightChangeListDisplay[] {
  return offers.map((o) => orderChangeOfferToListDisplay(o));
}
