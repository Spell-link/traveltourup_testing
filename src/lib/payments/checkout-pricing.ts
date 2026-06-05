import { AppError } from "@/lib/api/errors";
import type { StaysPaymentsResolvedConfig } from "@/config/stays-payments.config";
import type { CheckoutPricingBreakdown } from "@/lib/validations/checkout-payment.schema";

export type FxRatesMap = Record<string, number>;

export type CheckoutPriceInput = {
  supplierAmount: string;
  supplierCurrency: string;
  customerCurrencyRequested: string;
  chargeCurrency: string;
  chargeCurrencyFallback: boolean;
  fxRates: FxRatesMap;
  cfg: StaysPaymentsResolvedConfig;
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

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRatesMap,
): { amount: number; fxRate: number } {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return { amount, fxRate: 1 };

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    throw new AppError(400, `FX rate unavailable for ${from} → ${to}.`, "FX_UNAVAILABLE");
  }
  const usdAmount = from === "USD" ? amount : amount / fromRate;
  const converted = to === "USD" ? usdAmount : usdAmount * toRate;
  const fxRate = converted / amount;
  return { amount: converted, fxRate };
}

/**
 * Supplier quote → markup → FX to charge currency → Stripe fee gross-up.
 */
export function computeCheckoutBreakdown(input: CheckoutPriceInput): CheckoutPricingBreakdown & {
  subtotal_charged: string;
  stripe_fee_rate: string;
} {
  const supplier = parseMajorAmount("supplier", input.supplierAmount);
  const fixedExtra = parseMajorAmount("markup_fixed", input.cfg.markupFixed);
  const pctPart = (supplier * input.cfg.commissionPercent) / 100;
  const markupNumber = pctPart + fixedExtra;

  const { amount: convertedSupplier, fxRate } = convertAmount(
    supplier + markupNumber,
    input.supplierCurrency,
    input.chargeCurrency,
    input.fxRates,
  );

  const fee = input.cfg.stripeFeeRate;
  if (fee >= 1) {
    throw new AppError(500, "STRIPE_FEE_RATE must be < 1.", "CONFIG_ERROR");
  }

  const charge = convertedSupplier / (1 - fee);

  return {
    supplier_amount: round2Major(supplier),
    supplier_currency: input.supplierCurrency.toUpperCase(),
    markup_amount: round2Major(markupNumber),
    customer_total: round2Major(charge),
    charge_currency: input.chargeCurrency.toUpperCase(),
    charge_currency_fallback: input.chargeCurrencyFallback,
    fx_rate_applied: fxRate.toFixed(6),
    subtotal_charged: round2Major(convertedSupplier),
    stripe_fee_rate: String(fee),
  };
}

export function amountsWithinTolerance(
  expected: string,
  actual: string,
  toleranceMajor: number,
): boolean {
  const e = Number.parseFloat(expected);
  const a = Number.parseFloat(actual);
  if (!Number.isFinite(e) || !Number.isFinite(a)) return false;
  return Math.abs(e - a) <= toleranceMajor + 0.001;
}
