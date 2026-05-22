import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { offerItineraryFingerprint } from "@/lib/flights/list-display";

/**
 * Reads offers cached by {@link FlightList} for a search session id.
 * Keys: `{stableBodyKey}` → session id, `offers:{stableBodyKey}` → offer array.
 */
export function readCachedOffersForSearchSession(sessionId: string): FlightOfferDTO[] | null {
  const sid = sessionId.trim();
  if (!sid || typeof window === "undefined") return null;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || key.startsWith("offers:")) continue;
      if (sessionStorage.getItem(key)?.trim() !== sid) continue;
      const raw = sessionStorage.getItem(`offers:${key}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as FlightOfferDTO[];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function applyFareSiblings(allOffers: FlightOfferDTO[], offer: FlightOfferDTO): FlightOfferDTO[] {
  const fp = offerItineraryFingerprint(offer);
  const sib = allOffers.filter((o) => offerItineraryFingerprint(o) === fp);
  return sib.length
    ? sib.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
    : [offer];
}

export function resolveFareOptionsFromSession(
  sessionId: string,
  offer: FlightOfferDTO,
): FlightOfferDTO[] | null {
  const cached = readCachedOffersForSearchSession(sessionId);
  if (!cached?.length) return null;
  return applyFareSiblings(cached, offer);
}
