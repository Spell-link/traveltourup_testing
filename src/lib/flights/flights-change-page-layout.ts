/**
 * Layout for `/flights/change/[bookingId]` — browse (search form) vs results (offers list).
 */

export type FlightsChangePageLayout = "browse" | "results";

export type FlightChangeSearchUrlParams = {
  origin: string;
  destination: string;
  departure_date: string;
  slice_id: string;
  cabin_class: string;
  adults: string;
  children: string;
  infants: string;
};

export function flightChangeSearchFromUrl(sp: URLSearchParams): FlightChangeSearchUrlParams | null {
  const origin = sp.get("origin")?.trim().toUpperCase() ?? "";
  const destination = sp.get("destination")?.trim().toUpperCase() ?? "";
  const departure_date = sp.get("departure_date")?.trim() ?? "";
  const slice_id = sp.get("slice_id")?.trim() ?? "";
  if (!origin || !destination || !departure_date || !slice_id) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) return null;
  return {
    origin,
    destination,
    departure_date,
    slice_id,
    cabin_class: sp.get("cabin_class")?.trim() || "economy",
    adults: sp.get("adults")?.trim() || "1",
    children: sp.get("children")?.trim() || "0",
    infants: sp.get("infants")?.trim() || "0",
  };
}

export function getFlightsChangePageLayout(sp: URLSearchParams): FlightsChangePageLayout {
  return flightChangeSearchFromUrl(sp) != null ? "results" : "browse";
}

export function buildFlightChangeSearchUrl(
  bookingId: string,
  params: FlightChangeSearchUrlParams,
  options?: { changeId?: string },
): string {
  const p = new URLSearchParams();
  p.set("origin", params.origin);
  p.set("destination", params.destination);
  p.set("departure_date", params.departure_date);
  p.set("slice_id", params.slice_id);
  p.set("cabin_class", params.cabin_class);
  p.set("adults", params.adults);
  p.set("children", params.children);
  p.set("infants", params.infants);
  if (options?.changeId?.trim()) p.set("change_id", options.changeId.trim());
  return `/flights/change/${encodeURIComponent(bookingId)}?${p.toString()}`;
}

export function changeSearchMatchesSession(
  params: FlightChangeSearchUrlParams,
  session: {
    selectedSliceId?: string;
    origin?: string;
    destination?: string;
    departureDate?: string;
    cabinClass?: string;
  },
): boolean {
  return (
    session.selectedSliceId === params.slice_id &&
    (session.origin ?? "").toUpperCase() === params.origin &&
    (session.destination ?? "").toUpperCase() === params.destination &&
    session.departureDate === params.departure_date &&
    (session.cabinClass || "economy") === params.cabin_class
  );
}
