import "server-only";

import { getFlightPaymentsConfig } from "@/config/flight-payments.config";
import { prisma } from "@/lib/prisma";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  applyPricingRuleToConfig,
  pickPricingRule,
  type PricingRuleMatchContext,
  type ResolvedFlightPricingConfig,
  type StoredPricingRule,
} from "./flight-pricing-rule.core";

export {
  applyPricingRuleToConfig,
  pickPricingRule,
} from "./flight-pricing-rule.core";
export type {
  PricingRuleMatchContext,
  ResolvedFlightPricingConfig,
  StoredPricingRule,
} from "./flight-pricing-rule.core";

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

export async function resolveFlightPricingConfigForOffer(
  offer: FlightOfferDTO,
): Promise<ResolvedFlightPricingConfig> {
  const base = getFlightPaymentsConfig();
  const firstSlice = offer.slices[0];
  const ctx: PricingRuleMatchContext = {
    originIata: normalize(firstSlice?.origin_iata ?? null),
    destinationIata: normalize(firstSlice?.destination_iata ?? null),
    cabinClass: firstSlice?.segments[0]?.cabin_class ?? null,
    carrierIata: normalize(
      firstSlice?.segments[0]?.marketing_carrier_iata ??
        firstSlice?.segments[0]?.operating_carrier_iata ??
        null,
    ),
  };

  let rules: StoredPricingRule[];
  try {
    rules = (await prisma.flightPricingRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "asc" }, { created_at: "asc" }],
    })) as unknown as StoredPricingRule[];
  } catch {
    rules = [];
  }

  const rule = pickPricingRule(rules, ctx);
  return applyPricingRuleToConfig(base, rule);
}
