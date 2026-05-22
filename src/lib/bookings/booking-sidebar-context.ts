import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { readFlightSearchPath } from "@/lib/flights/flight-search-url-session";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";

export type BookingSidebarTravelers = {
  adults: number;
  children: number;
  infants: number;
};

export type BookingSidebarStayDates = {
  checkIn: string;
  checkOut: string;
};

function ymdFromIso(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function defaultCheckIn(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultCheckOut(daysAfter = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAfter);
  return d.toISOString().slice(0, 10);
}

/** Passenger counts from a Duffel offer (authoritative for checkout). */
export function travelersFromFlightOffer(offer: FlightOfferDTO): BookingSidebarTravelers {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const p of offer.passengers) {
    const t = (p.type ?? "adult").toLowerCase();
    if (t.includes("infant")) infants += 1;
    else if (t.includes("child")) children += 1;
    else adults += 1;
  }
  return {
    adults: Math.max(adults, 1),
    children,
    infants,
  };
}

/** Outbound / return (or arrival) dates from offer slices. */
export function flightTravelDatesFromOffer(offer: FlightOfferDTO): BookingSidebarStayDates {
  const slices = offer.slices;
  if (!slices.length) return { checkIn: "", checkOut: "" };

  const outboundDep = ymdFromIso(slices[0]?.segments[0]?.departing_at);

  if (slices.length >= 2) {
    const returnDep = ymdFromIso(slices[1]?.segments[0]?.departing_at);
    const lastSliceDep = ymdFromIso(slices[slices.length - 1]?.segments[0]?.departing_at);
    return {
      checkIn: outboundDep,
      checkOut: returnDep || lastSliceDep || outboundDep,
    };
  }

  const lastSeg = slices[0]?.segments[slices[0].segments.length - 1];
  const arrival = ymdFromIso(lastSeg?.arriving_at);
  return {
    checkIn: outboundDep,
    checkOut: arrival || outboundDep,
  };
}

function travelersFromUrlSearchParams(sp: URLSearchParams): BookingSidebarTravelers | null {
  const adultsRaw = sp.get("adults");
  const childrenRaw = sp.get("children");
  const infantsRaw = sp.get("infants");
  if (adultsRaw == null && childrenRaw == null && infantsRaw == null) return null;

  const adults = Math.max(1, parseInt(adultsRaw ?? "1", 10) || 1);
  const children = Math.max(0, parseInt(childrenRaw ?? "0", 10) || 0);
  const infants = Math.max(0, parseInt(infantsRaw ?? "0", 10) || 0);
  return { adults, children, infants };
}

function flightDatesFromUrlSearchParams(sp: URLSearchParams): BookingSidebarStayDates | null {
  const multiSlices = sp.get("slices");
  if (multiSlices) {
    try {
      const slices = JSON.parse(multiSlices) as Array<{ departure_date?: string }>;
      if (!Array.isArray(slices) || slices.length === 0) return null;
      const first = slices[0]?.departure_date?.trim();
      const second = slices[1]?.departure_date?.trim();
      if (!first) return null;
      return { checkIn: first, checkOut: second || first };
    } catch {
      return null;
    }
  }

  const departure = sp.get("departure_date")?.trim();
  if (!departure) return null;
  const ret = sp.get("return_date")?.trim();
  const trip = sp.get("trip") ?? "one_way";
  if (trip === "round_trip" && ret) {
    return { checkIn: departure, checkOut: ret };
  }
  return { checkIn: departure, checkOut: departure };
}

function readFlightSearchParams(): URLSearchParams | null {
  const path = readFlightSearchPath();
  if (!path) return null;
  const qIdx = path.indexOf("?");
  if (qIdx < 0) return null;
  return new URLSearchParams(path.slice(qIdx + 1));
}

/** Travelers + dates for flight detail sidebar (offer first, search URL as fallback). */
export function resolveFlightBookingSidebarMeta(offer: FlightOfferDTO | null | undefined): {
  travelers: BookingSidebarTravelers;
  dates: BookingSidebarStayDates;
} {
  const travelers = offer
    ? travelersFromFlightOffer(offer)
    : { adults: 1, children: 0, infants: 0 };

  let dates = offer ? flightTravelDatesFromOffer(offer) : { checkIn: "", checkOut: "" };

  const sp = readFlightSearchParams();
  if (sp) {
    const urlDates = flightDatesFromUrlSearchParams(sp);
    if (urlDates) {
      dates = {
        checkIn: dates.checkIn || urlDates.checkIn,
        checkOut: dates.checkOut || urlDates.checkOut,
      };
    }
    if (!offer) {
      const urlTravelers = travelersFromUrlSearchParams(sp);
      if (urlTravelers) {
        return { travelers: urlTravelers, dates: urlDates ?? dates };
      }
    }
  }

  if (!dates.checkIn && !dates.checkOut) {
    const today = defaultCheckIn();
    dates = { checkIn: today, checkOut: today };
  } else if (!dates.checkOut) {
    dates = { ...dates, checkOut: dates.checkIn };
  } else if (!dates.checkIn) {
    dates = { ...dates, checkIn: dates.checkOut };
  }

  return { travelers, dates };
}

/** Guests, rooms, and stay dates for hotel detail sidebar. */
export function resolveHotelBookingSidebarMeta(
  staysQuote?: { checkIn: string; checkOut: string } | null,
): {
  travelers: BookingSidebarTravelers;
  dates: BookingSidebarStayDates;
  rooms: number;
} {
  const snap = readStaysSearchFormSnapshot();
  return {
    travelers: {
      adults: snap?.adults ?? 1,
      children: snap?.children ?? 0,
      infants: 0,
    },
    dates: {
      checkIn: staysQuote?.checkIn ?? snap?.check_in_date ?? defaultCheckIn(),
      checkOut: staysQuote?.checkOut ?? snap?.check_out_date ?? defaultCheckOut(),
    },
    rooms: snap?.rooms ?? 1,
  };
}

/** Pickup / drop-off defaults for car detail sidebar. */
export function resolveCarBookingSidebarMeta(): BookingSidebarStayDates {
  return {
    checkIn: defaultCheckIn(),
    checkOut: defaultCheckOut(3),
  };
}
