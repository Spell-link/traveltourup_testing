import "server-only";
import { duffelFetch } from "./client";

export type GetOfferQuery = {
  /** When true, Duffel includes non-seat `available_services` on the offer (baggage, etc.). */
  return_available_services?: boolean;
};

export function getOffer(offerId: string, query?: GetOfferQuery) {
  const params = new URLSearchParams();
  if (query?.return_available_services) {
    params.set("return_available_services", "true");
  }
  const qs = params.toString();
  const path = `/air/offers/${encodeURIComponent(offerId)}${qs ? `?${qs}` : ""}`;

  return duffelFetch<unknown>(path);
}
