import "server-only";

/**
 * Flight ancillaries (P4): selections are validated against Duffel offer + seat maps before PaymentIntent creation.
 * Checkout is **atomic** — if any selected extra cannot be priced or conflicts with airline rules, the entire
 * selection fails with `ANCILLARY_PARTIAL_FAILURE` (see `AncillarySelectionError`) so we never charge a mismatched basket.
 */

import { AncillarySelectionError } from "@/lib/api/errors";
import { getOffer } from "@/lib/duffel/offers";
import { mapDuffelSeatMapsResponse } from "@/lib/duffel/dto/seat-map.dto";
import { listSeatMapsForOffer } from "@/lib/duffel/seat-maps";
import {
  mergeFlightOrderServiceLines,
  type FlightOrderServiceLine,
} from "@/lib/validations/flight-ancillaries.schema";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const MAX_DISTINCT_SERVICES = 32;

type ServicePriceIndex = Map<string, { amount: string; currency: string; maxQuantity: number | null }>;

function unwrapOfferData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

function indexOfferLevelServicesFromDto(offer: FlightOfferDTO, out: ServicePriceIndex) {
  for (const s of offer.available_services) {
    out.set(s.id, {
      amount: s.total_amount,
      currency: s.total_currency,
      maxQuantity: s.maximum_quantity,
    });
  }
}

function indexOfferLevelServices(offerData: Record<string, unknown>, out: ServicePriceIndex) {
  const arr = offerData.available_services;
  if (!Array.isArray(arr)) return;
  for (const s of arr) {
    if (!s || typeof s !== "object") continue;
    const rec = s as Record<string, unknown>;
    const id = rec.id;
    const total_amount = rec.total_amount;
    const total_currency = rec.total_currency;
    if (typeof id !== "string" || typeof total_amount !== "string" || typeof total_currency !== "string") {
      continue;
    }
    const mq = rec.maximum_quantity;
    const maxQuantity = typeof mq === "number" && Number.isFinite(mq) ? mq : null;
    out.set(id, { amount: total_amount, currency: total_currency, maxQuantity });
  }
}

function indexSeatMapServices(rawSeatMaps: unknown, out: ServicePriceIndex) {
  const mapped = mapDuffelSeatMapsResponse(rawSeatMaps);
  for (const sm of mapped) {
    for (const cab of sm.cabins) {
      for (const row of cab.rows) {
        for (const sec of row.sections) {
          for (const el of sec.elements) {
            for (const svc of el.services) {
              out.set(svc.id, {
                amount: svc.total_amount,
                currency: svc.total_currency,
                maxQuantity: 1,
              });
            }
          }
        }
      }
    }
  }
}

/** Stable JSON for comparing PaymentIntent idempotency and booking payloads. */
export function encodeAncillarySelection(services: FlightOrderServiceLine[] | null | undefined): string {
  return JSON.stringify(
    mergeFlightOrderServiceLines(services ?? []).sort((a, b) => a.id.localeCompare(b.id)),
  );
}

export function parseAncillarySelectionJson(raw: unknown): FlightOrderServiceLine[] {
  if (!Array.isArray(raw)) return [];
  const out: FlightOrderServiceLine[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = o.id;
    const quantity = o.quantity;
    if (typeof id === "string" && typeof quantity === "number" && Number.isFinite(quantity)) {
      out.push({ id, quantity });
    }
  }
  return out;
}

/**
 * Validates each service id against the current offer + seat maps and returns Duffel order `services` payload.
 * Atomic policy: any unknown id or currency mismatch fails the whole selection.
 */
export async function validateAndPriceOrderServices(input: {
  offerId: string;
  services: FlightOrderServiceLine[];
  /**
   * When the caller already has a refreshed offer, pass its `total_currency` so an empty
   * extras basket still returns a currency that matches the offer (avoids spurious mismatch
   * and skips an extra getOffer).
   */
  offerTotalCurrency?: string | null;
  /** Refreshed offer DTO from caller — skips redundant Duffel getOffer when set. */
  preloadedOffer?: FlightOfferDTO | null;
}): Promise<{
  orderServices: { id: string; quantity: number }[];
  servicesSubtotal: string;
  currency: string;
}> {
  const merged = mergeFlightOrderServiceLines(input.services);
  if (merged.length === 0) {
    const fromCaller =
      typeof input.offerTotalCurrency === "string" && input.offerTotalCurrency.trim() !== ""
        ? input.offerTotalCurrency.trim()
        : null;
    if (fromCaller) {
      return { orderServices: [], servicesSubtotal: "0.00", currency: fromCaller };
    }
    const offerRaw = await getOffer(input.offerId, { return_available_services: true });
    const offerData = unwrapOfferData(offerRaw);
    const oc =
      offerData && typeof offerData.total_currency === "string" ? offerData.total_currency : null;
    if (!oc) {
      throw new AncillarySelectionError("Offer currency missing.");
    }
    return { orderServices: [], servicesSubtotal: "0.00", currency: oc };
  }
  if (merged.length > MAX_DISTINCT_SERVICES) {
    throw new AncillarySelectionError("Too many ancillary selections.");
  }

  const index: ServicePriceIndex = new Map();
  let offerCurrency: string | null = null;

  if (input.preloadedOffer) {
    indexOfferLevelServicesFromDto(input.preloadedOffer, index);
    offerCurrency = input.preloadedOffer.total_currency;
  } else {
    const offerRaw = await getOffer(input.offerId, { return_available_services: true });
    const offerData = unwrapOfferData(offerRaw);
    if (!offerData) {
      throw new AncillarySelectionError("Could not load offer for extras.");
    }
    offerCurrency =
      typeof offerData.total_currency === "string" ? offerData.total_currency : null;
    indexOfferLevelServices(offerData, index);
  }

  if (!offerCurrency) {
    throw new AncillarySelectionError("Offer currency missing.");
  }

  const needsSeatMaps = merged.some((line) => !index.has(line.id));
  if (needsSeatMaps) {
    const seatRaw = await listSeatMapsForOffer(input.offerId);
    indexSeatMapServices(seatRaw, index);
  }

  let sum = 0;
  const orderServices: { id: string; quantity: number }[] = [];

  for (const line of merged) {
    const ref = index.get(line.id);
    if (!ref) {
      throw new AncillarySelectionError("An extra you selected is no longer available.");
    }
    if (ref.currency !== offerCurrency) {
      throw new AncillarySelectionError("Extras currency does not match the offer.");
    }
    if (ref.maxQuantity != null && line.quantity > ref.maxQuantity) {
      throw new AncillarySelectionError("Quantity exceeds what the airline allows for an extra.");
    }
    const unit = Number.parseFloat(ref.amount);
    if (!Number.isFinite(unit) || unit < 0) {
      throw new AncillarySelectionError("Invalid price for an extra.");
    }
    sum += unit * line.quantity;
    orderServices.push({ id: line.id, quantity: line.quantity });
  }

  const servicesSubtotal = (Math.round(sum * 100) / 100).toFixed(2);
  return { orderServices, servicesSubtotal, currency: offerCurrency };
}
