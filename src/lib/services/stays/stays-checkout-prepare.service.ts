import "server-only";

import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import {
  getStaysPaymentsConfig,
  stripeSupportsPresentmentCurrency,
} from "@/config/stays-payments.config";
import { getCurrencyCode } from "@/lib/currency/server";
import { isSupportedDisplayCurrency } from "@/lib/currency/constants";
import { computeCheckoutBreakdown } from "@/lib/payments/checkout-pricing";
import { fetchServerFxSnapshot, resolveChargeCurrency } from "@/lib/payments/fx-snapshot.server";
import {
  getStripeClient,
  isStripeConfigured,
  majorToStripeCents,
} from "@/lib/payments/stripe-client";
import { resolveFreshStaysQuote } from "@/lib/services/stays/stays-quote-lifecycle.service";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import { prisma } from "@/lib/prisma";
import type { StaysCheckoutPrepareBodyInput } from "@/lib/validations/stays.schema";

async function logEvent(input: {
  checkout_payment_record_id: string;
  type: "intent_created";
  amount?: string;
  currency?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    await bookingFinancialEventRepository.record({
      checkout_payment_record_id: input.checkout_payment_record_id,
      type: input.type,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      payload: (input.payload ?? null) as unknown as Prisma.InputJsonValue | null,
    });
  } catch {
    // best-effort audit
  }
}

function serializePrepare(row: {
  id: string;
  client_secret: string;
  supplier_amount: string;
  supplier_currency: string;
  markup_amount: string;
  charge_amount: string;
  charge_currency: string;
  charge_currency_fallback: boolean;
  fx_rate_applied: string | null;
  supplier_ref_id: string;
  quote_expires_at: Date | null;
}) {
  return {
    checkout_payment_id: row.id,
    client_secret: row.client_secret,
    pricing: {
      supplier_amount: row.supplier_amount,
      supplier_currency: row.supplier_currency,
      markup_amount: row.markup_amount,
      customer_total: row.charge_amount,
      charge_currency: row.charge_currency,
      charge_currency_fallback: row.charge_currency_fallback,
      fx_rate_applied: row.fx_rate_applied ?? undefined,
    },
    expires_at: row.quote_expires_at?.toISOString() ?? null,
    quote_id: row.supplier_ref_id,
  };
}

export async function createStaysCheckoutPrepare(input: {
  authz: AuthzContext | null;
  userId: string;
  body: StaysCheckoutPrepareBodyInput;
  idempotencyKey: string | null;
}) {
  if (!input.authz || !hasPermission(input.authz, "bookings:create")) {
    throw new ForbiddenError();
  }
  if (!isStripeConfigured()) {
    throw new AppError(503, "Stripe payments are not configured.", "STRIPE_NOT_CONFIGURED");
  }

  if (input.idempotencyKey) {
    const existing = await checkoutPaymentRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing && existing.user_id === input.userId && existing.supplier_ref_id === input.body.quote_id) {
      return serializePrepare(existing);
    }
  }

  const quote = await resolveFreshStaysQuote({
    quoteId: input.body.quote_id,
    rateId: input.body.rate_id ?? null,
  });
  const effectiveQuoteId = quote.quote_id;
  if (!quote.total_amount || !quote.total_currency) {
    throw new AppError(400, "Quote has no price.", "QUOTE_INVALID");
  }

  const cookieCurrency = await getCurrencyCode();
  const requestedRaw = input.body.customer_currency ?? cookieCurrency;
  const customerCurrencyRequested = isSupportedDisplayCurrency(requestedRaw)
    ? requestedRaw.toUpperCase()
    : "USD";

  const { chargeCurrency, fallback } = resolveChargeCurrency({
    customerCurrencyRequested,
    supplierCurrency: quote.total_currency,
    stripeSupports: stripeSupportsPresentmentCurrency,
  });

  const fxSnapshot = await fetchServerFxSnapshot();
  const cfg = getStaysPaymentsConfig();
  const breakdown = computeCheckoutBreakdown({
    supplierAmount: quote.total_amount,
    supplierCurrency: quote.total_currency,
    customerCurrencyRequested,
    chargeCurrency,
    chargeCurrencyFallback: fallback,
    fxRates: fxSnapshot.rates,
    cfg,
  });

  const stripe = getStripeClient();
  const pi = await stripe.paymentIntents.create({
    amount: majorToStripeCents(breakdown.customer_total, breakdown.charge_currency),
    currency: breakdown.charge_currency.toLowerCase(),
    capture_method: "manual",
    metadata: {
      product: "hotel",
      quote_id: effectiveQuoteId,
      user_id: input.userId,
    },
  });

  const record = await checkoutPaymentRepository.create({
    product_type: "hotel",
    provider: "stripe",
    provider_intent_id: pi.id,
    supplier_ref_id: effectiveQuoteId,
    user_id: input.userId,
    supplier_amount: breakdown.supplier_amount,
    supplier_currency: breakdown.supplier_currency,
    markup_amount: breakdown.markup_amount,
    commission_percent_applied: String(cfg.commissionPercent),
    markup_fixed_applied: cfg.markupFixed,
    charge_amount: breakdown.customer_total,
    charge_currency: breakdown.charge_currency,
    customer_currency_requested: customerCurrencyRequested,
    charge_currency_fallback: breakdown.charge_currency_fallback,
    fx_rate_applied: breakdown.fx_rate_applied,
    fx_snapshot_json: fxSnapshot as unknown as Prisma.InputJsonValue,
    stripe_fee_rate: breakdown.stripe_fee_rate,
    client_secret: pi.client_secret ?? "",
    status: "prepared",
    idempotency_key: input.idempotencyKey,
    quote_expires_at: quote.expires_at ? new Date(quote.expires_at) : null,
  });

  await stripe.paymentIntents.update(pi.id, {
    metadata: { checkout_payment_id: record.id },
  });

  await logEvent({
    checkout_payment_record_id: record.id,
    type: "intent_created",
    amount: breakdown.customer_total,
    currency: breakdown.charge_currency,
    payload: { stripe_payment_intent_id: pi.id, quote_id: effectiveQuoteId },
  });

  const hotelInterest = await prisma.customerProductInterest.findFirst({
    where: {
      user_id: input.userId,
      product_type: "hotel",
      converted_booking_id: null,
    },
    orderBy: { last_seen_at: "desc" },
  });
  const productRef = hotelInterest?.product_ref ?? effectiveQuoteId;

  trackJourneyEvent({
    userId: input.userId,
    eventType: "payment.prepared",
    productType: "hotel",
    productRef,
    stage: "payment_prepared",
    properties: { quote_id: effectiveQuoteId, checkout_payment_id: record.id },
    priceAmount: breakdown.customer_total,
    priceCurrency: breakdown.charge_currency,
    title: hotelInterest?.title ?? null,
    subtitle: hotelInterest?.subtitle ?? null,
  });

  return serializePrepare(record);
}
