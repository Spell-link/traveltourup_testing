import { AppError } from "@/lib/api/errors";
import type { FlightPaymentsResolvedConfig } from "@/config/flight-payments.config";

export type DuffelIntentPriceBreakdown = {
  /** Duffel offer base `total_amount` (major units), excluding extras. */
  offer_total: string;
  offer_currency: string;
  /** Sum of validated ancillary services in offer currency (major units). */
  services_subtotal: string;
  /** Commission portion: percent of (fare + services) + fixed markup, major units. */
  markup_amount: string;
  /** Customer charge before Duffel fee gross-up = (duffel_subtotal + markup) × fx (major units). */
  subtotal_charged: string;
  /** Amount sent to `createPaymentIntent` (major units, 2 decimals). */
  charge_amount: string;
  charge_currency: string;
};

function parseMajorAmount(label: string, value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, `Invalid ${label} amount.`, "VALIDATION_ERROR");
  }
  return n;
}

function round2Major(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Duffel docs: ((offer_and_services_total + markup) × FX) / (1 − duffel_payments_fee).
 * Commission percent applies to **fare + services**; fixed markup is added once.
 * @see https://duffel.com/docs/guides/collecting-customer-card-payments#create-paymentintent
 */
export function computeDuffelPaymentIntentBreakdown(
  offerTotal: string,
  offerCurrency: string,
  cfg: FlightPaymentsResolvedConfig,
  options?: { servicesSubtotal?: string },
): DuffelIntentPriceBreakdown {
  const fare = parseMajorAmount("offer", offerTotal);
  const servicesExtra = parseMajorAmount(
    "services",
    options?.servicesSubtotal != null && options.servicesSubtotal !== ""
      ? options.servicesSubtotal
      : "0",
  );
  const duffelSubtotal = fare + servicesExtra;
  const fixedExtra = parseMajorAmount("markup_fixed", cfg.markupFixed);
  const pct = cfg.commissionPercent;
  const pctPart = (duffelSubtotal * pct) / 100;
  const markupNumber = pctPart + fixedExtra;
  if (markupNumber < 0 || !Number.isFinite(markupNumber)) {
    throw new AppError(400, "Invalid markup calculation.", "VALIDATION_ERROR");
  }

  const { duffelPaymentsFeeRate: fee, fxRateToCustomerCurrency: fx } = cfg;
  if (fee >= 1) {
    throw new AppError(500, "DUFFEL_PAYMENTS_FEE_RATE must be < 1.", "CONFIG_ERROR");
  }

  const base = duffelSubtotal + markupNumber;
  const subtotal = base * fx;
  const charge = subtotal / (1 - fee);

  return {
    offer_total: round2Major(fare),
    offer_currency: offerCurrency,
    services_subtotal: round2Major(servicesExtra),
    markup_amount: round2Major(markupNumber),
    subtotal_charged: round2Major(subtotal),
    charge_amount: round2Major(charge),
    charge_currency: offerCurrency,
  };
}

/** Customer charge for a positive order-change delta (markup + Duffel fee on the airline delta only). */
export function computeOrderChangePaymentBreakdown(
  changeAmount: string,
  changeCurrency: string,
  cfg: FlightPaymentsResolvedConfig,
): DuffelIntentPriceBreakdown {
  return computeDuffelPaymentIntentBreakdown(changeAmount, changeCurrency, cfg, {
    servicesSubtotal: "0",
  });
}
