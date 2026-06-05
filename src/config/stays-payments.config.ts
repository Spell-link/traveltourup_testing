import { z } from "zod";

const schema = z.object({
  STAYS_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).optional(),
  STAYS_MARKUP_FIXED: z.string().optional(),
  STRIPE_FEE_RATE: z.coerce.number().gt(0).lt(1).optional(),
  STAYS_PRICE_TOLERANCE_MAJOR: z.coerce.number().min(0).optional(),
});

export type StaysPaymentsResolvedConfig = {
  commissionPercent: number;
  markupFixed: string;
  stripeFeeRate: number;
  priceToleranceMajor: number;
};

const DEFAULT_FEE = 0.029;

export function getStaysPaymentsConfig(): StaysPaymentsResolvedConfig {
  const parsed = schema.parse({
    STAYS_COMMISSION_PERCENT: process.env.STAYS_COMMISSION_PERCENT,
    STAYS_MARKUP_FIXED: process.env.STAYS_MARKUP_FIXED?.trim() || undefined,
    STRIPE_FEE_RATE: process.env.STRIPE_FEE_RATE,
    STAYS_PRICE_TOLERANCE_MAJOR: process.env.STAYS_PRICE_TOLERANCE_MAJOR,
  });
  return {
    commissionPercent: parsed.STAYS_COMMISSION_PERCENT ?? 5,
    markupFixed: parsed.STAYS_MARKUP_FIXED ?? "0",
    stripeFeeRate: parsed.STRIPE_FEE_RATE ?? DEFAULT_FEE,
    priceToleranceMajor: parsed.STAYS_PRICE_TOLERANCE_MAJOR ?? 1,
  };
}

/** ISO currencies Stripe commonly supports for presentment (extend per account). */
const STRIPE_PRESENTMENT_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "CAD",
  "AUD",
  "SGD",
  "HKD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "INR",
  "MYR",
  "THB",
  "NZD",
  "MXN",
  "BRL",
]);

export function stripeSupportsPresentmentCurrency(code: string): boolean {
  return STRIPE_PRESENTMENT_CURRENCIES.has(code.toUpperCase());
}
