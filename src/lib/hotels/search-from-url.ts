import { coordsForDestinationCode } from "@/data/stay-destination-coords";
import type { StaysSearchFormSnapshot, StaysDestinationSnapshot } from "@/lib/hotels/stays-search-snapshot";
import type { StaysSearchBodyInput } from "@/lib/validations/stays.schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type StaysSearchFromUrlResult = {
  apiBody: StaysSearchBodyInput;
  context: StaysSearchFormSnapshot;
};

function parseIntParam(sp: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = sp.get(key);
  if (raw == null || raw.trim() === "") return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseFloatParam(sp: URLSearchParams, key: string): number | null {
  const raw = sp.get(key)?.trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function guestsFromCounts(adults: number, children: number): StaysSearchBodyInput["guests"] {
  const guests: StaysSearchBodyInput["guests"] = [];
  for (let i = 0; i < adults; i++) guests.push({ type: "adult" });
  for (let i = 0; i < children; i++) guests.push({ type: "child", age: 8 });
  return guests;
}

function parseDestination(sp: URLSearchParams): StaysDestinationSnapshot | null {
  const kind = sp.get("dest_kind")?.trim().toLowerCase();
  if (kind === "popular") {
    const code = sp.get("dest_code")?.trim().toUpperCase();
    const name = sp.get("dest_name")?.trim();
    const country = sp.get("dest_country")?.trim();
    if (!code || !name || !country) return null;
    if (!coordsForDestinationCode(code)) return null;
    return { kind: "popular", code, name, country };
  }
  if (kind === "place") {
    const id = sp.get("place_id")?.trim();
    const name = sp.get("dest_name")?.trim();
    const iata = sp.get("dest_iata")?.trim().toUpperCase();
    const lat = parseFloatParam(sp, "lat");
    const lng = parseFloatParam(sp, "lng");
    const radius = parseFloatParam(sp, "radius") ?? 20;
    if (!id || !name || !iata || lat == null || lng == null) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    if (radius <= 0 || radius > 200) return null;
    const city_name = sp.get("dest_city")?.trim() || undefined;
    return {
      kind: "place",
      id,
      name,
      ...(city_name ? { city_name } : {}),
      iata_code: iata,
      latitude: lat,
      longitude: lng,
      radius,
    };
  }
  return null;
}

function locationFromDestination(dest: StaysDestinationSnapshot): StaysSearchBodyInput["location"] | null {
  if (dest.kind === "popular") {
    const coords = coordsForDestinationCode(dest.code);
    if (!coords) return null;
    return coords;
  }
  return {
    latitude: dest.latitude,
    longitude: dest.longitude,
    radius: dest.radius,
  };
}

/** True when URL contains enough stays search fields (with or without `stays_results`). */
export function hasStaysSearchInUrl(searchParams: URLSearchParams): boolean {
  return staysSearchFromUrl(searchParams) != null;
}

/**
 * Build Stays API body + session context snapshot from `/hotels?…` query params.
 * Used for WordPress → main site handoff and deep links.
 */
export function staysSearchFromUrl(searchParams: URLSearchParams): StaysSearchFromUrlResult | null {
  const check_in = searchParams.get("check_in")?.trim() ?? searchParams.get("check_in_date")?.trim();
  const check_out = searchParams.get("check_out")?.trim() ?? searchParams.get("check_out_date")?.trim();
  if (!check_in || !check_out || !ISO_DATE.test(check_in) || !ISO_DATE.test(check_out)) return null;
  if (check_out <= check_in) return null;

  const destination = parseDestination(searchParams);
  if (!destination) return null;

  const location = locationFromDestination(destination);
  if (!location) return null;

  const rooms = parseIntParam(searchParams, "rooms", 1, 1, 9);
  const adults = parseIntParam(searchParams, "adults", 2, 1, 20);
  const children = parseIntParam(searchParams, "children", 0, 0, 20);
  const guests = guestsFromCounts(adults, children);
  if (guests.length < 1 || guests.length > 20) return null;

  const apiBody: StaysSearchBodyInput = {
    check_in_date: check_in,
    check_out_date: check_out,
    rooms,
    guests,
    location,
  };

  const context: StaysSearchFormSnapshot = {
    check_in_date: check_in,
    check_out_date: check_out,
    rooms,
    adults,
    children,
    destination,
  };

  return { apiBody, context };
}

/** Serialize stays search params for redirect URLs (WordPress widget contract). */
export function buildStaysSearchQueryParams(input: {
  check_in_date: string;
  check_out_date: string;
  rooms: number;
  adults: number;
  children: number;
  destination: StaysDestinationSnapshot;
  nationality?: string;
  source_domain?: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  p.set("stays_results", "1");
  p.set("check_in", input.check_in_date);
  p.set("check_out", input.check_out_date);
  p.set("rooms", String(input.rooms));
  p.set("adults", String(input.adults));
  p.set("children", String(input.children));
  if (input.nationality?.trim()) p.set("nationality", input.nationality.trim().toUpperCase());

  const dest = input.destination;
  if (dest.kind === "popular") {
    p.set("dest_kind", "popular");
    p.set("dest_code", dest.code);
    p.set("dest_name", dest.name);
    p.set("dest_country", dest.country);
  } else {
    p.set("dest_kind", "place");
    p.set("place_id", dest.id);
    p.set("dest_name", dest.name);
    p.set("dest_iata", dest.iata_code);
    if (dest.city_name) p.set("dest_city", dest.city_name);
    p.set("lat", String(dest.latitude));
    p.set("lng", String(dest.longitude));
    p.set("radius", String(dest.radius));
  }

  if (input.source_domain?.trim()) p.set("source_domain", input.source_domain.trim());
  return p;
}
