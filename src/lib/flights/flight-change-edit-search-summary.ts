import {
  cabinTranslationKey,
  formatFlightSearchShortDate,
} from "@/lib/flights/flight-edit-search-summary";
import { flightChangeSearchFromUrl } from "@/lib/flights/flights-change-page-layout";

export type FlightChangeEditSearchTranslator = {
  modifyingHeadline: (v: { ref: string }) => string;
  route: (v: { origin: string; destination: string }) => string;
  dates: (v: { depart: string; passengers: string }) => string;
  passengers: (v: { count: number }) => string;
};

export function buildFlightChangeEditSearchSummary(
  queryString: string,
  locale: string,
  tr: FlightChangeEditSearchTranslator,
  cabinLabel: (flightsTabKey: string) => string,
): { headline: string; lines: string[] } | null {
  const sp = new URLSearchParams(queryString);
  const params = flightChangeSearchFromUrl(sp);
  if (!params) return null;

  const adults = Math.max(1, parseInt(params.adults, 10) || 1);
  const children = Math.max(0, parseInt(params.children, 10) || 0);
  const infants = Math.max(0, parseInt(params.infants, 10) || 0);
  const paxTotal = adults + children + infants;
  const passengersStr = tr.passengers({ count: paxTotal });
  const depart = formatFlightSearchShortDate(params.departure_date, locale);
  const cabinLine = cabinLabel(cabinTranslationKey(params.cabin_class));

  return {
    headline: tr.modifyingHeadline({ ref: "" }),
    lines: [
      tr.route({ origin: params.origin, destination: params.destination }),
      tr.dates({ depart, passengers: passengersStr }),
      cabinLine,
    ],
  };
}
