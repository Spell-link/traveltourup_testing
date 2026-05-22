export type FlightSegmentDTO = {
  id: string;
  origin_iata: string;
  destination_iata: string;
  origin_name: string;
  destination_name: string;
  origin_terminal: string | null;
  destination_terminal: string | null;
  departing_at: string | null;
  arriving_at: string | null;
  duration: string | null;
  marketing_carrier_iata: string | null;
  operating_carrier_iata: string | null;
  marketing_carrier_name: string | null;
  operating_carrier_name: string | null;
  marketing_carrier_logo_url: string | null;
  flight_number: string | null;
  cabin_class: string | null;
  /** Cabin / fare marketing label when present on Duffel segment passengers. */
  fare_brand_name: string | null;
};

export type FlightSliceDTO = {
  id: string;
  origin_iata: string;
  destination_iata: string;
  /** Number of intermediate stops (segments minus one). */
  stops_count: number;
  segments: FlightSegmentDTO[];
};

export type FlightOfferPassengerDTO = {
  id: string;
  type: string | null;
};

/** Non-seat services on the offer when fetched with `return_available_services=true` (baggage, etc.). */
export type FlightOfferServiceDTO = {
  id: string;
  total_amount: string;
  total_currency: string;
  type: string | null;
  maximum_quantity: number | null;
};

export type FlightOfferDTO = {
  id: string;
  total_amount: string;
  total_currency: string;
  expires_at: string | null;
  live_mode: boolean | null;
  slices: FlightSliceDTO[];
  /** Duffel passenger ids (`pas_…`) required for create order. */
  passengers: FlightOfferPassengerDTO[];
  /** Baggage and other offer-level services (not seats; seats come from seat maps). */
  available_services: FlightOfferServiceDTO[];
  /** When true, passport (or supported doc types) required on every passenger at booking. */
  passenger_identity_documents_required: boolean;
  /** e.g. passport, tax_id, known_traveler_number, passenger_redress_number */
  supported_passenger_identity_document_types: string[];
};

function pickIata(airport: unknown): string {
  if (!airport || typeof airport !== "object") return "";
  const code = (airport as { iata_code?: string }).iata_code;
  return typeof code === "string" ? code : "";
}

function pickCarrierIata(carrier: unknown): string | null {
  if (!carrier || typeof carrier !== "object") return null;
  const code = (carrier as { iata_code?: string }).iata_code;
  return typeof code === "string" ? code : null;
}

function pickCarrierName(carrier: unknown): string | null {
  if (!carrier || typeof carrier !== "object") return null;
  const n = (carrier as { name?: string }).name;
  return typeof n === "string" ? n : null;
}

function pickCarrierLogoUrl(carrier: unknown): string | null {
  if (!carrier || typeof carrier !== "object") return null;
  const c = carrier as { logo_symbol_url?: string; logo_lockup_url?: string };
  if (typeof c.logo_symbol_url === "string") return c.logo_symbol_url;
  if (typeof c.logo_lockup_url === "string") return c.logo_lockup_url;
  return null;
}

function pickAirportName(airport: unknown): string {
  if (!airport || typeof airport !== "object") return "";
  const n = (airport as { name?: string }).name;
  return typeof n === "string" ? n : "";
}

function pickSegmentTerminal(seg: Record<string, unknown>, key: string): string | null {
  const v = seg[key];
  if (typeof v === "string") return v;
  return null;
}

function segmentFlightNumber(seg: Record<string, unknown>): string | null {
  const n =
    seg.marketing_carrier_flight_number ??
    seg.operating_carrier_flight_number ??
    seg.flight_number;
  return typeof n === "string" ? n : null;
}

function firstPassengerCabin(seg: Record<string, unknown>): string | null {
  const passengers = seg.passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return null;
  const first = passengers[0];
  if (!first || typeof first !== "object") return null;
  const cabin = (first as { cabin_class?: string }).cabin_class;
  return typeof cabin === "string" ? cabin : null;
}

function firstPassengerFareBrand(seg: Record<string, unknown>): string | null {
  const passengers = seg.passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return null;
  const first = passengers[0];
  if (!first || typeof first !== "object") return null;
  const p = first as Record<string, unknown>;
  const raw = p.cabin_marketing_name ?? p.fare_brand_name;
  return typeof raw === "string" ? raw : null;
}

function mapSegment(seg: unknown): FlightSegmentDTO | null {
  if (!seg || typeof seg !== "object") return null;
  const o = seg as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string") return null;

  return {
    id,
    origin_iata: pickIata(o.origin),
    destination_iata: pickIata(o.destination),
    origin_name: pickAirportName(o.origin),
    destination_name: pickAirportName(o.destination),
    origin_terminal:
      pickSegmentTerminal(o, "origin_terminal") ?? pickSegmentTerminal(o, "departing_terminal"),
    destination_terminal:
      pickSegmentTerminal(o, "destination_terminal") ?? pickSegmentTerminal(o, "arriving_terminal"),
    departing_at: typeof o.departing_at === "string" ? o.departing_at : null,
    arriving_at: typeof o.arriving_at === "string" ? o.arriving_at : null,
    duration: typeof o.duration === "string" ? o.duration : null,
    marketing_carrier_iata: pickCarrierIata(o.marketing_carrier),
    operating_carrier_iata: pickCarrierIata(o.operating_carrier),
    marketing_carrier_name: pickCarrierName(o.marketing_carrier),
    operating_carrier_name: pickCarrierName(o.operating_carrier),
    marketing_carrier_logo_url: pickCarrierLogoUrl(o.marketing_carrier),
    flight_number: segmentFlightNumber(o),
    cabin_class: firstPassengerCabin(o),
    fare_brand_name: firstPassengerFareBrand(o),
  };
}

function mapSlice(slice: unknown): FlightSliceDTO | null {
  if (!slice || typeof slice !== "object") return null;
  const s = slice as Record<string, unknown>;
  const id = s.id;
  if (typeof id !== "string") return null;

  const rawSegments = s.segments;
  const segments: FlightSegmentDTO[] = [];
  if (Array.isArray(rawSegments)) {
    for (const item of rawSegments) {
      const mapped = mapSegment(item);
      if (mapped) segments.push(mapped);
    }
  }

  const stopsCount = Math.max(0, segments.length - 1);

  return {
    id,
    origin_iata: pickIata(s.origin),
    destination_iata: pickIata(s.destination),
    stops_count: stopsCount,
    segments,
  };
}

function unwrapOfferPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

/**
 * Normalizes a Duffel "get offer" JSON response (`{ data: offer }`) or a bare offer object.
 */
export function mapDuffelOfferToDto(raw: unknown): FlightOfferDTO {
  const offer = unwrapOfferPayload(raw);
  if (!offer) {
    throw new Error("Invalid Duffel offer payload");
  }

  const id = offer.id;
  const total_amount = offer.total_amount;
  const total_currency = offer.total_currency;
  if (typeof id !== "string" || typeof total_amount !== "string" || typeof total_currency !== "string") {
    throw new Error("Duffel offer missing id, total_amount, or total_currency");
  }

  const slices: FlightSliceDTO[] = [];
  const rawSlices = offer.slices;
  if (Array.isArray(rawSlices)) {
    for (const sl of rawSlices) {
      const mapped = mapSlice(sl);
      if (mapped) slices.push(mapped);
    }
  }

  const passengers: FlightOfferPassengerDTO[] = [];
  const rawPassengers = offer.passengers;
  if (Array.isArray(rawPassengers)) {
    for (const p of rawPassengers) {
      if (!p || typeof p !== "object") continue;
      const rec = p as Record<string, unknown>;
      const pid = rec.id;
      if (typeof pid !== "string" || !pid.startsWith("pas_")) continue;
      const ptype = rec.type;
      passengers.push({
        id: pid,
        type: typeof ptype === "string" ? ptype : null,
      });
    }
  }

  const available_services: FlightOfferServiceDTO[] = [];
  const rawAvail = offer.available_services;
  if (Array.isArray(rawAvail)) {
    for (const s of rawAvail) {
      if (!s || typeof s !== "object") continue;
      const rec = s as Record<string, unknown>;
      const sid = rec.id;
      const tamt = rec.total_amount;
      const tcur = rec.total_currency;
      if (typeof sid !== "string" || typeof tamt !== "string" || typeof tcur !== "string") continue;
      const mq = rec.maximum_quantity;
      const typ = rec.type;
      available_services.push({
        id: sid,
        total_amount: tamt,
        total_currency: tcur,
        type: typeof typ === "string" ? typ : null,
        maximum_quantity: typeof mq === "number" && Number.isFinite(mq) ? mq : null,
      });
      if (available_services.length >= 48) break;
    }
  }

  return {
    id,
    total_amount,
    total_currency,
    expires_at: typeof offer.expires_at === "string" ? offer.expires_at : null,
    live_mode: typeof offer.live_mode === "boolean" ? offer.live_mode : null,
    slices,
    passengers,
    available_services,
    passenger_identity_documents_required:
      offer.passenger_identity_documents_required === true,
    supported_passenger_identity_document_types: Array.isArray(
      offer.supported_passenger_identity_document_types,
    )
      ? (offer.supported_passenger_identity_document_types as unknown[]).filter(
          (t): t is string => typeof t === "string",
        )
      : [],
  };
}
