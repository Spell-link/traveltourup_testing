import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

export function isInfantPassengerType(type: string | null | undefined): boolean {
  const t = type?.toLowerCase() ?? "";
  return t === "infant" || t === "infant_without_seat";
}

export function isAdultPassengerType(type: string | null | undefined): boolean {
  return type?.toLowerCase() === "adult";
}

export function getOfferAdultPassengerIds(offer: FlightOfferDTO): string[] {
  return offer.passengers.filter((p) => isAdultPassengerType(p.type)).map((p) => p.id);
}

export function isOfferAdultPassengerId(offer: FlightOfferDTO, passengerId: string): boolean {
  return isAdultPassengerType(getOfferPassengerType(offer, passengerId));
}

export function getOfferPassengerType(
  offer: FlightOfferDTO,
  passengerId: string,
  index?: number,
): string | null {
  if (index != null && offer.passengers[index]?.id === passengerId) {
    return offer.passengers[index]?.type ?? null;
  }
  return offer.passengers.find((p) => p.id === passengerId)?.type ?? null;
}

/**
 * Infant row → accompanying adult `pas_` id.
 * Auto-assigns round-robin when the UI has not chosen an adult yet.
 */
export function resolveInfantToAccompanyingAdultMap(
  offer: FlightOfferDTO,
  passengers: Array<{ passenger_id: string; accompanying_adult_id?: string | null }>,
): Map<string, string> {
  const adultIds = getOfferAdultPassengerIds(offer);
  const map = new Map<string, string>();
  let autoIdx = 0;

  passengers.forEach((p, i) => {
    const type = getOfferPassengerType(offer, p.passenger_id, i);
    if (!isInfantPassengerType(type)) return;

    const chosen = p.accompanying_adult_id?.trim();
    if (chosen && isOfferAdultPassengerId(offer, chosen)) {
      map.set(p.passenger_id, chosen);
      return;
    }

    if (adultIds.length > 0) {
      map.set(p.passenger_id, adultIds[autoIdx % adultIds.length]!);
      autoIdx += 1;
    }
  });

  return map;
}

/**
 * Duffel order API: each adult carrying an infant must set `infant_passenger_id` to the infant's `pas_` id.
 * @see https://duffel.com/docs/api/orders/create-order
 */
export function buildAdultToInfantDuffelLink(
  infantToAdult: Map<string, string>,
): Map<string, string> {
  const adultToInfant = new Map<string, string>();
  for (const [infantId, adultId] of infantToAdult) {
    adultToInfant.set(adultId, infantId);
  }
  return adultToInfant;
}

export function countOfferInfants(offer: FlightOfferDTO): number {
  return offer.passengers.filter((p) => isInfantPassengerType(p.type)).length;
}

export function duffelPassengersMissingInfantLinks(
  offer: FlightOfferDTO,
  duffelPassengers: Record<string, unknown>[],
): boolean {
  const infantCount = countOfferInfants(offer);
  if (infantCount === 0) return false;

  const linkedInfants = new Set<string>();
  for (const row of duffelPassengers) {
    const infantId = row.infant_passenger_id;
    if (typeof infantId === "string" && infantId.startsWith("pas_")) {
      linkedInfants.add(infantId);
    }
  }

  return linkedInfants.size < infantCount;
}
