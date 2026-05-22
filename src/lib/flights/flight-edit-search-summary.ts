import { flightSearchBodyFromUrl } from "@/lib/flights/search-from-url";

export function formatFlightSearchShortDate(ymd: string, locale: string): string {
  const parts = ymd.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return ymd;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function cabinTranslationKey(cabinRaw: string): string {
  switch (cabinRaw) {
    case "premium_economy":
      return "cabinPremiumEconomy";
    case "business":
      return "cabinBusiness";
    case "first":
      return "cabinFirstClass";
    case "economy":
    default:
      return "cabinEconomy";
  }
}

export type FlightEditSearchTranslator = {
  titleRoundTrip: (v: { destination: string }) => string;
  titleOneWay: (v: { destination: string }) => string;
  titleMultiCity: () => string;
  routeRound: (v: { origin: string; destination: string }) => string;
  routeOneWay: (v: { origin: string; destination: string }) => string;
  datesRound: (v: { depart: string; returnDate: string; passengers: string }) => string;
  datesOneWay: (v: { depart: string; passengers: string }) => string;
  datesMultiCity: (v: { depart: string; passengers: string }) => string;
  passengers: (v: { count: number }) => string;
};

export function buildFlightEditSearchSummary(
  queryString: string,
  locale: string,
  tr: FlightEditSearchTranslator,
  cabinLabel: (flightsTabKey: string) => string,
): { headline: string; lines: string[] } | null {
  const sp = new URLSearchParams(queryString);
  if (!flightSearchBodyFromUrl(sp)) return null;

  const adults = Math.max(1, parseInt(sp.get("adults") ?? "1", 10) || 1);
  const children = Math.max(0, parseInt(sp.get("children") ?? "0", 10) || 0);
  const infants = Math.max(0, parseInt(sp.get("infants") ?? "0", 10) || 0);
  const paxTotal = adults + children + infants;
  const passengersStr = tr.passengers({ count: paxTotal });

  const cabinRaw = sp.get("cabin_class") ?? "economy";
  const cabinLine = cabinLabel(cabinTranslationKey(cabinRaw));

  const slicesJson = sp.get("slices");
  if (slicesJson) {
    try {
      const slices = JSON.parse(slicesJson) as {
        origin?: string;
        destination?: string;
        departure_date?: string;
      }[];
      if (!Array.isArray(slices) || slices.length === 0) return null;
      const headline = tr.titleMultiCity();
      const routeLine = slices
        .filter((s) => s.origin && s.destination)
        .map((s) => `${String(s.origin)} → ${String(s.destination)}`)
        .join(" · ");
      const firstDep = slices[0]?.departure_date ?? "";
      const depFmt = firstDep ? formatFlightSearchShortDate(firstDep, locale) : "—";
      const datesLine = tr.datesMultiCity({ depart: depFmt, passengers: passengersStr });
      return { headline, lines: [routeLine, datesLine, cabinLine] };
    } catch {
      return null;
    }
  }

  const origin = (sp.get("origin") ?? "").trim().toUpperCase();
  const destination = (sp.get("destination") ?? "").trim().toUpperCase();
  const departureDate = sp.get("departure_date") ?? "";
  const returnDate = sp.get("return_date")?.trim() ?? "";
  const trip = sp.get("trip") ?? "one_way";
  const isRoundTrip = trip === "round_trip" && Boolean(returnDate);

  const depFmt = departureDate ? formatFlightSearchShortDate(departureDate, locale) : "—";
  const retFmt = returnDate ? formatFlightSearchShortDate(returnDate, locale) : "";

  if (isRoundTrip) {
    const headline = tr.titleRoundTrip({ destination });
    const routeLine = tr.routeRound({ origin, destination });
    const datesLine = tr.datesRound({
      depart: depFmt,
      returnDate: retFmt || "—",
      passengers: passengersStr,
    });
    return { headline, lines: [routeLine, datesLine, cabinLine] };
  }

  const headline = tr.titleOneWay({ destination });
  const routeLine = tr.routeOneWay({ origin, destination });
  const datesLine = tr.datesOneWay({ depart: depFmt, passengers: passengersStr });
  return { headline, lines: [routeLine, datesLine, cabinLine] };
}
