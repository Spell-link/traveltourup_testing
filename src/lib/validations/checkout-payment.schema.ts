import { z } from "zod";
import { SUPPORTED_DISPLAY_CURRENCIES } from "@/lib/currency/constants";

export const checkoutPaymentRecordIdSchema = z.string().cuid();

export const duffelQuoteIdSchema = z
  .string()
  .regex(/^quo_/, "Expected a Duffel stays quote id (quo_…)")
  .max(128);

export const idempotencyKeyHeaderSchema = z.string().min(1).max(128);

export const customerCurrencySchema = z.enum(SUPPORTED_DISPLAY_CURRENCIES);

export const isoCurrencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Expected ISO 4217 currency code");

export const majorAmountStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Expected a major-unit amount with up to 2 decimals");

export const checkoutPricingBreakdownSchema = z.object({
  supplier_amount: majorAmountStringSchema,
  supplier_currency: isoCurrencyCodeSchema,
  markup_amount: majorAmountStringSchema,
  customer_total: majorAmountStringSchema,
  charge_currency: isoCurrencyCodeSchema,
  charge_currency_fallback: z.boolean(),
  fx_rate_applied: z.string().optional(),
});

export type CheckoutPricingBreakdown = z.infer<typeof checkoutPricingBreakdownSchema>;

/** Stripe PaymentIntent statuses we persist on checkout_payment_records. */
export const CHECKOUT_PAYMENT_STATUSES = [
  "prepared",
  "requires_capture",
  "captured",
  "voided",
  "capture_failed",
  "refunded",
  "partial_refund",
  "failed",
] as const;

export type CheckoutPaymentStatus = (typeof CHECKOUT_PAYMENT_STATUSES)[number];

export const checkoutPaymentStatusSchema = z.enum(CHECKOUT_PAYMENT_STATUSES);
