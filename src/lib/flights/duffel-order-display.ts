import type { FlightListDisplay } from "@/lib/flights/list-display";

export type DuffelOrderPolicy = {
  changeText: string;
  refundText: string;
};

export type DuffelOrderPassengerDisplay = {
  id: string;
  typeLabel: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  flightSummary: string | null;
  baggageLabels: string[];
};

export type DuffelOrderSegmentDisplay = {
  departDateTime: string;
  departLine: string;
  arriveDateTime: string;
  arriveLine: string;
  durationLabel: string;
  metaLine: string;
  baggageLabels: string[];
  originIata: string;
  destinationIata: string;
  marketingCarrierName: string;
  logoUrl: string | null;
  fareBrandName: string | null;
  timeRangeLabel: string;
  routeCodesLabel: string;
  stopsLabel: string;
};

export type DuffelOrderSliceDisplay = {
  segments: DuffelOrderSegmentDisplay[];
};

export type DuffelOrderBilling = {
  baseAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
};

export type DuffelOrderDisplay = {
  bookingReference: string;
  orderId: string;
  ownerName: string;
  ownerLogoUrl: string | null;
  ownerIata: string | null;
  createdAt: string | null;
  policies: DuffelOrderPolicy;
  billing: DuffelOrderBilling;
  slices: DuffelOrderSliceDisplay[];
  passengers: DuffelOrderPassengerDisplay[];
  adultCount: number;
  flight: FlightListDisplay;
};

function readObj(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function readStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** ISO-8601 duration e.g. PT3H13M → 03h 13m */
export function formatDuffelDuration(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return iso;
  const h = m[1] ? Number.parseInt(m[1], 10) : 0;
  const min = m[2] ? Number.parseInt(m[2], 10) : 0;
  return `${String(h).padStart(2, "0")}h ${String(min).padStart(2, "0")}m`;
}

export function formatDuffelDateTime(iso: string | null | undefined, locale = "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuffelTime(iso: string | null | undefined, locale = "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

function formatBornOn(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

function formatGender(g: string | null): string | null {
  if (!g) return null;
  if (g === "m") return "Male";
  if (g === "f") return "Female";
  return g;
}

function formatTitle(title: string | null): string {
  if (!title) return "";
  return title.replace(/_/g, " ").toUpperCase();
}

function airportLine(
  verb: "Depart from" | "Arrive at",
  name: string | null,
  iata: string,
  terminal: string | null,
): string {
  const base = name ? `${name} (${iata})` : iata;
  return terminal ? `${verb} ${base}, Terminal ${terminal}` : `${verb} ${base}`;
}

function baggageLabelsFromSegment(seg: Record<string, unknown>): string[] {
  const passengers = seg.passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return [];
  const p0 = readObj(passengers[0]);
  const baggages = p0?.baggages;
  if (!Array.isArray(baggages)) return [];
  const labels: string[] = [];
  for (const b of baggages) {
    const row = readObj(b);
    if (!row) continue;
    const type = readStr(row.type);
    const qty = typeof row.quantity === "number" ? row.quantity : 1;
    if (type === "checked") labels.push(`${qty} checked bag${qty > 1 ? "s" : ""}`);
    else if (type === "carry_on") labels.push(`${qty} carry-on bag${qty > 1 ? "s" : ""}`);
    else if (type) labels.push(`${qty} ${type.replace(/_/g, " ")}`);
  }
  return labels;
}

function policyText(order: Record<string, unknown>): DuffelOrderPolicy {
  const conditions = readObj(order.conditions);
  const change = readObj(conditions?.change_before_departure);
  const refund = readObj(conditions?.refund_before_departure);

  const changeAllowed = change?.allowed === true;
  const changeText = changeAllowed
    ? "This order is changeable"
    : "This order is not changeable";

  const refundAllowed = refund?.allowed === true;
  let refundText = "This order is not refundable";
  if (refundAllowed) {
    const penalty = readStr(refund?.penalty_amount);
    const cur = readStr(refund?.penalty_currency) ?? "USD";
    if (penalty && Number.parseFloat(penalty) > 0) {
      const sym = cur === "USD" ? "$" : `${cur} `;
      refundText = `This order is refundable up until the initial departure date (a refund penalty of ${sym}${penalty} will apply)`;
    } else {
      refundText = "This order is refundable up until the initial departure date";
    }
  }

  return { changeText, refundText };
}

function readAirport(
  node: unknown,
): { iata: string; name: string | null; terminal: string | null } {
  const o = readObj(node);
  return {
    iata: readStr(o?.iata_code)?.toUpperCase() ?? "",
    name: readStr(o?.name),
    terminal: null,
  };
}

function readCarrier(
  node: unknown,
): { name: string | null; iata: string | null; logo: string | null } {
  const o = readObj(node);
  return {
    name: readStr(o?.name),
    iata: readStr(o?.iata_code),
    logo: readStr(o?.logo_symbol_url) ?? readStr(o?.logo_lockup_url),
  };
}

function buildFlightFromOrder(
  order: Record<string, unknown>,
  slice: Record<string, unknown>,
  seg: Record<string, unknown>,
  totalAmount: string,
  currency: string,
): FlightListDisplay {
  const origin = readAirport(seg.origin ?? slice.origin);
  const dest = readAirport(seg.destination ?? slice.destination);
  const marketing = readCarrier(seg.marketing_carrier);
  const owner = readCarrier(order.owner);
  const carrierName = marketing.name ?? owner.name ?? "Airline";
  const carrierIata = marketing.iata ?? owner.iata ?? "—";
  const fn =
    readStr(seg.marketing_carrier_flight_number) ??
    readStr(seg.operating_carrier_flight_number) ??
    readStr(seg.flight_number) ??
    "—";
  const dep = readStr(seg.departing_at);
  const arr = readStr(seg.arriving_at);
  const depDate = dep?.slice(0, 10) ?? "";
  const durationIso = readStr(seg.duration) ?? readStr(slice.duration);
  const stops = Array.isArray(seg.stops) ? seg.stops.length : 0;
  const fareBrand = readStr(slice.fare_brand_name);
  const pax0 = Array.isArray(seg.passengers) ? readObj(seg.passengers[0]) : null;
  const cabin =
    readStr(pax0?.cabin_class_marketing_name) ??
    (readStr(pax0?.cabin_class)?.replace(/_/g, " ") ?? null);

  const bagLabels = baggageLabelsFromSegment(seg);
  const refund = readObj(readObj(order.conditions)?.refund_before_departure);
  const refundable = refund?.allowed === true;

  const depTime = dep
    ? new Date(dep).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const arrTime = arr
    ? new Date(arr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";

  const totalN = Number.parseFloat(totalAmount);

  return {
    id: readStr(order.id) ?? "order",
    airline: carrierName,
    airlineCode: carrierIata,
    airlineName: carrierName,
    airlineLogoUrl: marketing.logo ?? owner.logo,
    flightNumber: `${carrierIata} ${fn}`,
    flightNumbersSearch: `${carrierIata} ${fn}`.toUpperCase(),
    departureTime: depTime,
    arrivalTime: arrTime,
    duration: formatDuffelDuration(durationIso),
    durationMinutes: 0,
    stops,
    stopDetails: stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`,
    layoverSummary: "",
    price: Number.isFinite(totalN) ? totalN : 0,
    currency: currency.toUpperCase(),
    departureAirport: origin.iata || "—",
    arrivalAirport: dest.iata || "—",
    departureDate: depDate,
    arrivalDateLabel: arr?.slice(0, 10) ?? depDate,
    firstDepartingAt: dep,
    lastArrivingAt: arr,
    amenities: [],
    baggage: bagLabels.length ? bagLabels.join(" • ") : "See airline",
    refundable,
    rating: 0,
    reviews: 0,
    departureTerminal: readStr(seg.origin_terminal) ?? "—",
    arrivalTerminal: readStr(seg.destination_terminal) ?? "—",
    expires_at: null,
    fromCode: origin.iata,
    toCode: dest.iata,
    freeCancellation: refundable,
    seatSelection: false,
    segmentDetails: [],
    fareBrandName: fareBrand ?? cabin?.replace(/_/g, " ") ?? null,
  };
}

export function parseDuffelOrderDisplay(
  orderRaw: unknown,
  fallbackTotal: string | number,
  fallbackCurrency: string,
): DuffelOrderDisplay | null {
  const order = readObj(orderRaw);
  if (!order) return null;

  const slicesRaw = order.slices;
  if (!Array.isArray(slicesRaw) || slicesRaw.length === 0) return null;

  const currency =
    readStr(order.total_currency) ?? readStr(order.base_currency) ?? fallbackCurrency;
  const totalAmount =
    readStr(order.total_amount) ?? String(fallbackTotal);
  const baseAmount = readStr(order.base_amount) ?? totalAmount;
  const taxAmount = readStr(order.tax_amount) ?? "0";

  const owner = readCarrier(order.owner);
  const bookingReference =
    readStr(order.booking_reference) ??
    (Array.isArray(order.booking_references)
      ? readStr(readObj(order.booking_references[0])?.booking_reference)
      : null) ??
    "—";

  const slices: DuffelOrderSliceDisplay[] = [];
  let primaryFlight: FlightListDisplay | null = null;

  for (const slRaw of slicesRaw) {
    const slice = readObj(slRaw);
    if (!slice) continue;
    const segsRaw = slice.segments;
    if (!Array.isArray(segsRaw)) continue;

    const segments: DuffelOrderSegmentDisplay[] = [];
    for (const segRaw of segsRaw) {
      const seg = readObj(segRaw);
      if (!seg) continue;

      const origin = readAirport(seg.origin ?? slice.origin);
      const dest = readAirport(seg.destination ?? slice.destination);
      const marketing = readCarrier(seg.marketing_carrier);
      const aircraft = readObj(seg.aircraft);
      const aircraftName = readStr(aircraft?.name);
      const iata = marketing.iata ?? "—";
      const fn =
        readStr(seg.marketing_carrier_flight_number) ??
        readStr(seg.operating_carrier_flight_number) ??
        "—";
      const dep = readStr(seg.departing_at);
      const arr = readStr(seg.arriving_at);
      const bagLabels = baggageLabelsFromSegment(seg);
      const cabin =
        readStr(readObj(Array.isArray(seg.passengers) ? seg.passengers[0] : null)?.cabin_class)?.replace(
          /_/g,
          " ",
        ) ?? "Economy";
      const fareBrand = readStr(slice.fare_brand_name);
      const durationLabel = formatDuffelDuration(readStr(seg.duration) ?? readStr(slice.duration));
      const stops = Array.isArray(seg.stops) ? seg.stops.length : 0;

      const metaParts = [
        cabin.charAt(0).toUpperCase() + cabin.slice(1),
        marketing.name,
        aircraftName,
        `${iata}${fn}`,
        ...bagLabels,
      ].filter(Boolean);

      if (!primaryFlight) {
        primaryFlight = buildFlightFromOrder(order, slice, seg, totalAmount, currency);
      }

      segments.push({
        departDateTime: formatDuffelDateTime(dep),
        departLine: airportLine(
          "Depart from",
          origin.name,
          origin.iata,
          readStr(seg.origin_terminal),
        ),
        arriveDateTime: formatDuffelDateTime(arr),
        arriveLine: airportLine(
          "Arrive at",
          dest.name,
          dest.iata,
          readStr(seg.destination_terminal),
        ),
        durationLabel,
        metaLine: metaParts.join(" • "),
        baggageLabels: bagLabels,
        originIata: origin.iata,
        destinationIata: dest.iata,
        marketingCarrierName: marketing.name ?? owner.name ?? "Airline",
        logoUrl: marketing.logo ?? owner.logo,
        fareBrandName: fareBrand,
        timeRangeLabel: `${formatDuffelTime(dep)} – ${formatDuffelTime(arr)}`,
        routeCodesLabel: `${origin.iata} – ${dest.iata}`,
        stopsLabel: stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`,
      });
    }

    if (segments.length > 0) slices.push({ segments });
  }

  if (!primaryFlight || slices.length === 0) return null;

  const passengers: DuffelOrderPassengerDisplay[] = [];
  const paxRaw = order.passengers;
  if (Array.isArray(paxRaw)) {
    for (const pRaw of paxRaw) {
      const p = readObj(pRaw);
      if (!p) continue;
      const type = readStr(p.type) ?? "adult";
      const given = readStr(p.given_name) ?? "";
      const family = readStr(p.family_name) ?? "";
      const title = formatTitle(readStr(p.title));
      const name = [title, given, family].filter(Boolean).join(" ").trim() || "Passenger";

      const firstSeg = slices[0]?.segments[0];
      const depIso = primaryFlight.firstDepartingAt;
      let flightSummary: string | null = null;
      if (firstSeg && depIso) {
        const d = new Date(depIso);
        if (!Number.isNaN(d.getTime())) {
          const datePart = d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          flightSummary = `${firstSeg.originIata} to ${firstSeg.destinationIata} on ${datePart} at ${formatDuffelTime(depIso)}`;
        }
      }
      passengers.push({
        id: readStr(p.id) ?? name,
        typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
        name,
        dateOfBirth: formatBornOn(readStr(p.born_on)),
        gender: formatGender(readStr(p.gender)),
        email: readStr(p.email),
        phone: readStr(p.phone_number),
        flightSummary,
        baggageLabels: slices[0]?.segments[0]?.baggageLabels ?? [],
      });
    }
  }

  const adultCount = passengers.filter((p) => p.typeLabel.toLowerCase() === "adult").length;

  return {
    bookingReference,
    orderId: readStr(order.id) ?? "—",
    ownerName: owner.name ?? primaryFlight.airline,
    ownerLogoUrl: owner.logo,
    ownerIata: owner.iata,
    createdAt: readStr(order.created_at),
    policies: policyText(order),
    billing: { baseAmount, taxAmount, totalAmount, currency },
    slices,
    passengers,
    adultCount: adultCount || passengers.length,
    flight: primaryFlight,
  };
}
