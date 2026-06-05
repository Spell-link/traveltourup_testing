import "server-only";

import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import { createDuffelPaymentIntent } from "@/lib/duffel/payment-intents";
import { computeDuffelPaymentIntentBreakdown } from "@/lib/payments/duffel-intent-pricing";
import { refreshFlightOffer } from "@/lib/services/flights/flights-offer.service";
import {
  encodeAncillarySelection,
  parseAncillarySelectionJson,
  validateAndPriceOrderServices,
} from "@/lib/services/flights/flight-ancillaries.service";
import { resolveFlightPricingConfigForOffer } from "@/lib/services/flights/flight-pricing-rule.service";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import type { FlightOrderServiceLine } from "@/lib/validations/flight-ancillaries.schema";
import type { FlightPaymentsResolvedConfig } from "@/config/flight-payments.config";
import type { DuffelIntentPriceBreakdown } from "@/lib/payments/duffel-intent-pricing";

function pitPricingSnapshotFields(
  breakdown: DuffelIntentPriceBreakdown,
  cfg: FlightPaymentsResolvedConfig & { applied_rule_id?: string | null },
) {
  const charge = Number.parseFloat(breakdown.charge_amount);
  const subtotal = Number.parseFloat(breakdown.subtotal_charged);
  const feeAmount = (Math.round((charge - subtotal) * 100) / 100).toFixed(2);
  return {
    subtotal_charged_amount: breakdown.subtotal_charged,
    duffel_payments_fee_amount: feeAmount,
    duffel_payments_fee_rate: String(cfg.duffelPaymentsFeeRate),
    fx_rate_applied: String(cfg.fxRateToCustomerCurrency),
    commission_percent_applied: String(cfg.commissionPercent),
    markup_fixed_applied: cfg.markupFixed,
    applied_pricing_rule_id: cfg.applied_rule_id ?? null,
  };
}

function serializeRecord(row: {
  duffel_intent_id: string;
  offer_id: string;
  charge_amount: string;
  charge_currency: string;
  offer_amount: string;
  offer_currency: string;
  markup_amount: string;
  services_subtotal_amount: string | null;
  status: string;
  client_token: string;
}) {
  return {
    payment_intent_id: row.duffel_intent_id,
    client_token: row.client_token,
    status: row.status,
    offer_id: row.offer_id,
    pricing: {
      offer_total: row.offer_amount,
      offer_currency: row.offer_currency,
      services_subtotal: row.services_subtotal_amount ?? "0.00",
      commission_and_fees_markup: row.markup_amount,
      customer_charge_amount: row.charge_amount,
      customer_charge_currency: row.charge_currency,
    },
  };
}

export async function createFlightCheckoutPaymentIntent(input: {
  offerId: string;
  idempotencyKey: string | null;
  services: FlightOrderServiceLine[];
  userId?: string | null;
}) {
  const selectionKey = encodeAncillarySelection(input.services);

  if (input.idempotencyKey) {
    const existing = await flightPaymentIntentRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      const storedKey = encodeAncillarySelection(parseAncillarySelectionJson(existing.ancillary_selection));
      if (storedKey !== selectionKey) {
        throw new AppError(
          409,
          "Idempotency-Key was already used with different ancillary selections.",
          "IDEMPOTENCY_MISMATCH",
        );
      }
      return { idempotent_replay: true as const, ...serializeRecord(existing) };
    }
  }

  const offer = await refreshFlightOffer(input.offerId);
  const priced = await validateAndPriceOrderServices({
    offerId: input.offerId,
    services: input.services,
    offerTotalCurrency: offer.total_currency,
    preloadedOffer: offer,
  });
  if (priced.currency !== offer.total_currency) {
    throw new AppError(400, "Extras currency does not match offer.", "VALIDATION_ERROR");
  }

  /**
   * Resolve env defaults overlaid with the highest-priority matching
   * `FlightPricingRule` (per-route/cabin/carrier) and apply hard caps. See
   * `flight-pricing-rule.service.ts`.
   */
  const cfg = await resolveFlightPricingConfigForOffer(offer);

  const breakdown = computeDuffelPaymentIntentBreakdown(
    offer.total_amount,
    offer.total_currency,
    cfg,
    { servicesSubtotal: priced.servicesSubtotal },
  );

  const pit = await createDuffelPaymentIntent({
    amount: breakdown.charge_amount,
    currency: breakdown.charge_currency,
  });

  if (!pit.client_token || !pit.id) {
    throw new AppError(502, "Invalid payment intent from supplier.", "PAYMENT_INTENT_INVALID");
  }

  const snapshot = pitPricingSnapshotFields(breakdown, cfg);
  const duffelCost = (
    Number.parseFloat(breakdown.offer_total) + Number.parseFloat(priced.servicesSubtotal)
  ).toFixed(2);

  const persisted = await flightPaymentIntentRepository.create({
    duffel_intent_id: pit.id,
    offer_id: offer.id,
    charge_amount: breakdown.charge_amount,
    charge_currency: breakdown.charge_currency,
    offer_amount: breakdown.offer_total,
    offer_currency: breakdown.offer_currency,
    markup_amount: breakdown.markup_amount,
    services_subtotal_amount: priced.servicesSubtotal,
    ...snapshot,
    ...(priced.orderServices.length > 0
      ? { ancillary_selection: priced.orderServices as unknown as Prisma.InputJsonValue }
      : {}),
    status: pit.status || "requires_payment_method",
    client_token: pit.client_token,
    idempotency_key: input.idempotencyKey,
  });

  try {
    await bookingFinancialEventRepository.record({
      type: "intent_created",
      flight_payment_intent_record_id: persisted.id,
      amount: breakdown.charge_amount,
      currency: breakdown.charge_currency,
      payload: {
        duffel_intent_id: pit.id,
        offer_id: offer.id,
        offer_total: breakdown.offer_total,
        services_subtotal: priced.servicesSubtotal,
        markup_amount: breakdown.markup_amount,
        customer_paid: breakdown.charge_amount,
        duffel_cost: duffelCost,
        duffel_payment_fee: snapshot.duffel_payments_fee_amount,
        commission: breakdown.markup_amount,
        applied_pricing_rule_id: cfg.applied_rule_id,
        applied_pricing_rule_name: cfg.applied_rule_name,
        commission_percent_applied: cfg.commissionPercent,
        markup_fixed_applied: cfg.markupFixed,
      } as Prisma.InputJsonValue,
    });
  } catch {
    // best-effort audit log
  }

  if (input.userId) {
    const slice = offer.slices[0];
    const seg = slice?.segments[0];
    trackJourneyEvent({
      userId: input.userId,
      eventType: "payment.prepared",
      productType: "flight",
      productRef: offer.id,
      stage: "payment_prepared",
      properties: {
        payment_intent_id: pit.id,
        offer_total: breakdown.offer_total,
      },
      title: seg?.marketing_carrier_name
        ? `${seg.marketing_carrier_name} ${seg.flight_number ?? ""}`.trim()
        : null,
      subtitle: slice ? `${slice.origin_iata} → ${slice.destination_iata}` : null,
      priceAmount: breakdown.charge_amount,
      priceCurrency: breakdown.charge_currency,
    });
  }

  return {
    idempotent_replay: false as const,
    ...serializeRecord({
      duffel_intent_id: pit.id,
      offer_id: offer.id,
      charge_amount: breakdown.charge_amount,
      charge_currency: breakdown.charge_currency,
      offer_amount: breakdown.offer_total,
      offer_currency: breakdown.offer_currency,
      markup_amount: breakdown.markup_amount,
      services_subtotal_amount: priced.servicesSubtotal,
      status: pit.status || "requires_payment_method",
      client_token: pit.client_token,
    }),
    pricing_detail: {
      subtotal_before_payment_fee: breakdown.subtotal_charged,
      duffel_payments_fee_rate: cfg.duffelPaymentsFeeRate,
      fx_rate_applied: cfg.fxRateToCustomerCurrency,
    },
  };
}

