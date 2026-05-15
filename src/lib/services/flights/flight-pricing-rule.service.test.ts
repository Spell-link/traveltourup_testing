import { describe, expect, it } from "vitest";

import type { FlightPaymentsResolvedConfig } from "@/config/flight-payments.config";
import {
  applyPricingRuleToConfig,
  pickPricingRule,
} from "@/lib/services/flights/flight-pricing-rule.core";

type RuleSeed = Parameters<typeof applyPricingRuleToConfig>[1];

function makeRule(overrides: Partial<NonNullable<RuleSeed>> = {}): NonNullable<RuleSeed> {
  return {
    id: overrides.id ?? "r1",
    name: overrides.name ?? "rule",
    enabled: overrides.enabled ?? true,
    priority: overrides.priority ?? 100,
    origin_iata: overrides.origin_iata ?? null,
    destination_iata: overrides.destination_iata ?? null,
    carrier_iata: overrides.carrier_iata ?? null,
    cabin_class: overrides.cabin_class ?? null,
    commission_percent_override: overrides.commission_percent_override ?? null,
    markup_fixed_override: overrides.markup_fixed_override ?? null,
    max_commission_percent: overrides.max_commission_percent ?? null,
    max_markup_fixed: overrides.max_markup_fixed ?? null,
    effective_from: overrides.effective_from ?? null,
    effective_to: overrides.effective_to ?? null,
  };
}

const BASE_CFG: FlightPaymentsResolvedConfig = {
  commissionPercent: 5,
  markupFixed: "1.00",
  duffelPaymentsFeeRate: 0.029,
  fxRateToCustomerCurrency: 1,
  priceToleranceMajor: 2,
};

describe("pickPricingRule", () => {
  const ctx = {
    originIata: "JFK",
    destinationIata: "LHR",
    cabinClass: "economy",
    carrierIata: "BA",
  } as const;

  it("returns null when no rules match", () => {
    const rule = pickPricingRule([makeRule({ origin_iata: "XXX" })], ctx);
    expect(rule).toBeNull();
  });

  it("matches a wildcard rule (no filters)", () => {
    const generic = makeRule({ id: "wild", priority: 100 });
    const specific = makeRule({ id: "spec", origin_iata: "ZZZ", priority: 10 });
    const winner = pickPricingRule([generic, specific], ctx);
    expect(winner?.id).toBe("wild");
  });

  it("prefers lower priority then higher specificity", () => {
    const r1 = makeRule({ id: "loose", origin_iata: "JFK", priority: 100 });
    const r2 = makeRule({
      id: "tight",
      origin_iata: "JFK",
      destination_iata: "LHR",
      priority: 100,
    });
    const r3 = makeRule({ id: "lowestPriority", priority: 50 });
    expect(pickPricingRule([r1, r2], ctx)?.id).toBe("tight");
    expect(pickPricingRule([r1, r2, r3], ctx)?.id).toBe("lowestPriority");
  });

  it("ignores disabled rules", () => {
    const r1 = makeRule({ id: "active", origin_iata: "JFK" });
    const r2 = makeRule({ id: "off", origin_iata: "JFK", enabled: false, priority: 1 });
    expect(pickPricingRule([r1, r2], ctx)?.id).toBe("active");
  });

  it("respects the effective window", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 60 * 1000);
    expect(
      pickPricingRule([makeRule({ origin_iata: "JFK", effective_from: future })], ctx),
    ).toBeNull();
    expect(
      pickPricingRule([makeRule({ origin_iata: "JFK", effective_to: past })], ctx),
    ).toBeNull();
  });
});

describe("applyPricingRuleToConfig", () => {
  it("returns base config when no rule applied", () => {
    const result = applyPricingRuleToConfig(BASE_CFG, null);
    expect(result.commissionPercent).toBe(5);
    expect(result.markupFixed).toBe("1.00");
    expect(result.applied_rule_id).toBeNull();
  });

  it("applies overrides", () => {
    const rule = makeRule({
      commission_percent_override: { toString: () => "7" },
      markup_fixed_override: "2.50",
    });
    const result = applyPricingRuleToConfig(BASE_CFG, rule);
    expect(result.commissionPercent).toBe(7);
    expect(result.markupFixed).toBe("2.50");
    expect(result.applied_rule_id).toBe("r1");
  });

  it("clamps to caps even when override would exceed them", () => {
    const rule = makeRule({
      commission_percent_override: { toString: () => "12" },
      markup_fixed_override: "20.00",
      max_commission_percent: { toString: () => "8" },
      max_markup_fixed: "10.00",
    });
    const result = applyPricingRuleToConfig(BASE_CFG, rule);
    expect(result.commissionPercent).toBe(8);
    expect(result.markupFixed).toBe("10.00");
  });

  it("caps the base when only caps are set", () => {
    const rule = makeRule({
      max_commission_percent: { toString: () => "3" },
      max_markup_fixed: "0.50",
    });
    const result = applyPricingRuleToConfig(BASE_CFG, rule);
    expect(result.commissionPercent).toBe(3);
    expect(result.markupFixed).toBe("0.50");
  });
});
