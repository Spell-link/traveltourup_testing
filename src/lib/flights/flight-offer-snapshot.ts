import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const SNAPSHOT_TTL_MS = 2 * 60 * 1000;

function storageKey(offerId: string): string {
  return `ttu_flight_offer_snapshot:${offerId.trim()}`;
}

type OfferSnapshot = {
  at: number;
  offer: FlightOfferDTO;
};

export function writeFlightOfferSnapshot(offer: FlightOfferDTO): void {
  if (typeof window === "undefined") return;
  try {
    const payload: OfferSnapshot = { at: Date.now(), offer };
    sessionStorage.setItem(storageKey(offer.id), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readFlightOfferSnapshot(offerId: string): FlightOfferDTO | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(offerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfferSnapshot;
    if (!parsed?.offer?.id) return null;
    if (Date.now() - parsed.at > SNAPSHOT_TTL_MS) return null;
    if (parsed.offer.expires_at) {
      const exp = new Date(parsed.offer.expires_at).getTime();
      if (Number.isFinite(exp) && exp <= Date.now()) return null;
    }
    return parsed.offer;
  } catch {
    return null;
  }
}

export function clearFlightOfferSnapshot(offerId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(offerId));
  } catch {
    /* ignore */
  }
}
