import { parseIsoCurrencyAmountLine } from "@/lib/currency/format-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import { estimateAncillariesAddOn } from "@/lib/flights/estimate-ancillaries";

export type FlightCheckoutChargePricing = {
  amount: string;
  currency: string;
};

export type FlightCheckoutDisplayPricingSource =
  | "charge"
  | "booking_details"
  | "estimate"
  | "fare";

export type FlightCheckoutDisplayPricing = {
  currency: string;
  /** Base offer fare (Duffel `total_amount`). */
  base: number;
  /** Bags + seats subtotal before markup/payment fees. */
  extrasSubtotal: number;
  /** Total used for the primary “Total amount” row before payment intent. */
  estimatedTotal: number;
  /** Authoritative amount for the primary total row. */
  primaryAmount: number;
  primarySource: FlightCheckoutDisplayPricingSource;
};

function parseOfferBase(offer: FlightOfferDTO): { base: number; currency: string } {
  const base = Number.parseFloat(offer.total_amount);
  const currency = offer.total_currency;
  return {
    base: Number.isFinite(base) ? base : 0,
    currency: typeof currency === "string" ? currency : "USD",
  };
}

export function resolveFlightCheckoutDisplayPricing(input: {
  offer: FlightOfferDTO | null;
  bagQuantities: Record<string, number>;
  seatSelections: Record<string, string>;
  seatMaps: SeatMapDTO[] | null;
  bookingDetailsPriceLine?: string;
  chargePricing?: FlightCheckoutChargePricing | null;
}): FlightCheckoutDisplayPricing | null {
  const { offer, bagQuantities, seatSelections, seatMaps, bookingDetailsPriceLine, chargePricing } =
    input;

  if (chargePricing) {
    const primary = Number.parseFloat(chargePricing.amount);
    if (Number.isFinite(primary)) {
      if (offer) {
        const { base, currency } = parseOfferBase(offer);
        const { addOn } = estimateAncillariesAddOn(
          offer,
          bagQuantities,
          seatSelections,
          seatMaps,
        );
        return {
          currency: chargePricing.currency,
          base,
          extrasSubtotal: addOn,
          estimatedTotal: primary,
          primaryAmount: primary,
          primarySource: "charge",
        };
      }
      return {
        currency: chargePricing.currency,
        base: 0,
        extrasSubtotal: 0,
        estimatedTotal: primary,
        primaryAmount: primary,
        primarySource: "charge",
      };
    }
  }

  if (!offer) {
    const parsedBooking = parseIsoCurrencyAmountLine(bookingDetailsPriceLine);
    if (parsedBooking) {
      return {
        currency: parsedBooking.currency,
        base: parsedBooking.amount,
        extrasSubtotal: 0,
        estimatedTotal: parsedBooking.amount,
        primaryAmount: parsedBooking.amount,
        primarySource: "booking_details",
      };
    }
    return null;
  }

  const { base, currency } = parseOfferBase(offer);
  const { addOn } = estimateAncillariesAddOn(offer, bagQuantities, seatSelections, seatMaps);
  const estimatedFromSelections = base + addOn;

  const parsedBooking = parseIsoCurrencyAmountLine(bookingDetailsPriceLine);
  if (parsedBooking) {
    const extrasSubtotal = Math.max(0, parsedBooking.amount - base);
    return {
      currency: parsedBooking.currency,
      base,
      extrasSubtotal,
      estimatedTotal: parsedBooking.amount,
      primaryAmount: parsedBooking.amount,
      primarySource: "booking_details",
    };
  }

  if (addOn > 0 || Object.values(seatSelections).some(Boolean)) {
    return {
      currency,
      base,
      extrasSubtotal: addOn,
      estimatedTotal: estimatedFromSelections,
      primaryAmount: estimatedFromSelections,
      primarySource: "estimate",
    };
  }

  return {
    currency,
    base,
    extrasSubtotal: 0,
    estimatedTotal: base,
    primaryAmount: base,
    primarySource: "fare",
  };
}
