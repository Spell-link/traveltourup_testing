/**
 * Pure functions for the flight pricing rule engine. Lives in its own module
 * (without `server-only`) so it is importable from vitest.
 *
 * The DB-backed entry point and Prisma wiring live in
 * `flight-pricing-rule.service.ts`.
 */

import type { FlightPaymentsResolvedConfig } from "@/config/flight-payments.config";

export type PricingRuleMatchContext = {
  originIata: string | null;
  destinationIata: string | null;
  cabinClass: string | null;
  carrierIata: string | null;
};

export type StoredPricingRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  origin_iata: string | null;
  destination_iata: string | null;
  carrier_iata: string | null;
  cabin_class: string | null;
  commission_percent_override: { toString(): string } | null;
  markup_fixed_override: string | null;
  max_commission_percent: { toString(): string } | null;
  max_markup_fixed: string | null;
  effective_from: Date | null;
  effective_to: Date | null;
};

export type ResolvedFlightPricingConfig = FlightPaymentsResolvedConfig & {
  applied_rule_id: string | null;
  applied_rule_name: string | null;
};

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

function isActive(rule: StoredPricingRule, now: Date): boolean {
  if (!rule.enabled) return false;
  if (rule.effective_from && rule.effective_from > now) return false;
  if (rule.effective_to && rule.effective_to < now) return false;
  return true;
}

function ruleMatches(rule: StoredPricingRule, ctx: PricingRuleMatchContext): boolean {
  if (rule.origin_iata && normalize(rule.origin_iata) !== ctx.originIata) return false;
  if (rule.destination_iata && normalize(rule.destination_iata) !== ctx.destinationIata)
    return false;
  if (rule.carrier_iata && normalize(rule.carrier_iata) !== ctx.carrierIata) return false;
  if (rule.cabin_class && rule.cabin_class !== ctx.cabinClass) return false;
  return true;
}

function specificity(rule: StoredPricingRule): number {
  return (
    (rule.origin_iata ? 1 : 0) +
    (rule.destination_iata ? 1 : 0) +
    (rule.carrier_iata ? 1 : 0) +
    (rule.cabin_class ? 1 : 0)
  );
}

function parseFiniteNumber(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function pickPricingRule(
  rules: StoredPricingRule[],
  ctx: PricingRuleMatchContext,
  now: Date = new Date(),
): StoredPricingRule | null {
  const candidates = rules
    .filter((r) => isActive(r, now))
    .filter((r) => ruleMatches(r, ctx));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return specificity(b) - specificity(a);
  });
  return candidates[0] ?? null;
}

export function applyPricingRuleToConfig(
  base: FlightPaymentsResolvedConfig,
  rule: StoredPricingRule | null,
): ResolvedFlightPricingConfig {
  if (!rule) {
    return {
      ...base,
      applied_rule_id: null,
      applied_rule_name: null,
    };
  }

  const overridePct = parseFiniteNumber(rule.commission_percent_override?.toString() ?? null);
  const overrideFixed = parseFiniteNumber(rule.markup_fixed_override);

  let commissionPercent = base.commissionPercent;
  if (overridePct != null) commissionPercent = overridePct;
  const capPct = parseFiniteNumber(rule.max_commission_percent?.toString() ?? null);
  if (capPct != null) commissionPercent = Math.min(commissionPercent, capPct);
  if (commissionPercent < 0) commissionPercent = 0;
  if (commissionPercent > 100) commissionPercent = 100;

  let markupFixedNum = parseFiniteNumber(base.markupFixed) ?? 0;
  if (overrideFixed != null) markupFixedNum = overrideFixed;
  const capFixed = parseFiniteNumber(rule.max_markup_fixed);
  if (capFixed != null) markupFixedNum = Math.min(markupFixedNum, capFixed);
  if (markupFixedNum < 0) markupFixedNum = 0;
  const markupFixed = markupFixedNum.toFixed(2);

  return {
    ...base,
    commissionPercent,
    markupFixed,
    applied_rule_id: rule.id,
    applied_rule_name: rule.name,
  };
}
