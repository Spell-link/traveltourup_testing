import "server-only";
import { getOffer } from "@/lib/duffel/offers";
import { DuffelApiError } from "@/lib/duffel/errors";
import { mapDuffelOfferToDto, type FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { OfferUnavailableError } from "@/lib/api/errors";

export async function refreshFlightOffer(offerId: string): Promise<FlightOfferDTO> {
  try {
    const raw = await getOffer(offerId, { return_available_services: true });

    return mapDuffelOfferToDto(raw);
  } catch (e) {
    if (e instanceof DuffelApiError && (e.status === 404 || e.status === 410)) {
      throw new OfferUnavailableError();
    }
    throw e;
  }
}
