import { AIRPORTS } from "@/data/airports";
import type { Airport } from "@/types/flight";
import { duffelCabinToUi } from "@/lib/validations/flights.schema";
import {
  flightChangeSearchFromUrl,
  type FlightChangeSearchUrlParams,
} from "@/lib/flights/flights-change-page-layout";
import type { HydratedFlightsFormState } from "@/lib/flights/hydrate-flights-form-from-url";

function airportFromIata(iata: string): Airport {
  const code = iata.trim().toUpperCase();
  const found = AIRPORTS.find((a) => a.code === code);
  if (found) return found;
  return { code, name: code, city: "", country: "" };
}

function monthYearFromYmd(
  ymd: string,
  fallback: { month: number; year: number },
): { month: number; year: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return fallback;
  const [ys, ms] = ymd.split("-");
  const y = parseInt(ys ?? "", 10);
  const m = parseInt(ms ?? "", 10);
  if (Number.isNaN(y) || Number.isNaN(m)) return fallback;
  return { month: m - 1, year: y };
}

const now = () => new Date();

/**
 * Maps change-flow URL params to `FlightsTab` controlled fields.
 */
export function hydrateFlightsFormFromChangeUrl(
  sp: URLSearchParams,
): (HydratedFlightsFormState & { sliceId: string }) | null {
  const params = flightChangeSearchFromUrl(sp);
  if (!params) return null;

  const adults = Math.max(1, parseInt(params.adults, 10) || 1);
  const children = Math.max(0, parseInt(params.children, 10) || 0);
  const infants = Math.max(0, parseInt(params.infants, 10) || 0);
  const cabinClass = duffelCabinToUi(params.cabin_class);

  const fallback = { month: now().getMonth(), year: now().getFullYear() };
  const depMy = monthYearFromYmd(params.departure_date, fallback);

  return {
    sliceId: params.slice_id,
    tripType: "one-way",
    cabinClass,
    travelers: { adults, children, infants },
    childAges: Array.from({ length: children }, () => 8),
    selectedFromAirport: airportFromIata(params.origin),
    selectedToAirport: airportFromIata(params.destination),
    departDate: params.departure_date,
    returnDate: "",
    flights: [
      {
        id: 1,
        from: airportFromIata(params.origin),
        to: airportFromIata(params.destination),
        date: params.departure_date,
      },
    ],
    advMaxConnections: "",
    advSupplierTimeout: 0,
    preferredCarrierIatas: [],
    s0DepFrom: "",
    s0DepTo: "",
    s0ArrFrom: "",
    s0ArrTo: "",
    s1DepFrom: "",
    s1DepTo: "",
    s1ArrFrom: "",
    s1ArrTo: "",
    currentMonth: depMy.month,
    currentYear: depMy.year,
    returnCurrentMonth: fallback.month,
    returnCurrentYear: fallback.year,
  };
}

export function flightChangeSearchParamsFromHydrated(input: {
  sliceId: string;
  selectedFromAirport: { code: string } | null;
  selectedToAirport: { code: string } | null;
  departDate: string;
  cabinClass: string;
  travelers: { adults: number; children: number; infants: number };
}): FlightChangeSearchUrlParams | null {
  if (!input.selectedFromAirport?.code || !input.selectedToAirport?.code || !input.departDate) {
    return null;
  }
  const cabinMap: Record<string, string> = {
    economy: "economy",
    "premium-economy": "premium_economy",
    business: "business",
    first: "first",
  };
  return {
    origin: input.selectedFromAirport.code,
    destination: input.selectedToAirport.code,
    departure_date: input.departDate,
    slice_id: input.sliceId,
    cabin_class: cabinMap[input.cabinClass] ?? "economy",
    adults: String(input.travelers.adults),
    children: String(input.travelers.children),
    infants: String(input.travelers.infants),
  };
}
