import type { FlightSearchBody } from "@/lib/validations/flights.schema";

/**
 * Canonical identity string for identical flight searches (sessionStorage keys + POST dedupe map).
 */
export function stableFlightSearchBodyKey(body: FlightSearchBody): string {
  const norm = {
    slices: body.slices.map((s) => ({
      origin: s.origin.trim().toUpperCase(),
      destination: s.destination.trim().toUpperCase(),
      departure_date: s.departure_date,
      ...(s.departure_time ? { departure_time: s.departure_time } : {}),
      ...(s.arrival_time ? { arrival_time: s.arrival_time } : {}),
    })),
    passengers: body.passengers,
    cabin_class: body.cabin_class,
    ...(body.max_connections !== undefined ? { max_connections: body.max_connections } : {}),
    ...(body.supplier_timeout_ms !== undefined ? { supplier_timeout_ms: body.supplier_timeout_ms } : {}),
    ...(body.max_price ? { max_price: body.max_price } : {}),
    ...(body.carrier_iata?.length
      ? { carrier_iata: [...body.carrier_iata].map((c) => c.trim().toUpperCase()).sort() }
      : {}),
    ...(body.max_stops !== undefined ? { max_stops: body.max_stops } : {}),
    limit: body.limit,
  };
  return JSON.stringify(norm);
}

/** sessionStorage key segment for storing session id + offers for a normalized search. */
export function flightSessionIdStorageKey(stableBodyKey: string): string {
  return stableBodyKey;
}
