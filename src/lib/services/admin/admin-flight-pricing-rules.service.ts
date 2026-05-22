import "server-only";

import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import type { SerializedPricingRule } from "@/lib/admin/flight-pricing-rule.types";
import type { FlightPricingRuleBody } from "@/lib/validations/flight-pricing-rule.schema";

export type { SerializedPricingRule } from "@/lib/admin/flight-pricing-rule.types";

function serialize(row: {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  origin_iata: string | null;
  destination_iata: string | null;
  carrier_iata: string | null;
  cabin_class: string | null;
  commission_percent_override: Prisma.Decimal | null;
  markup_fixed_override: string | null;
  max_commission_percent: Prisma.Decimal | null;
  max_markup_fixed: string | null;
  effective_from: Date | null;
  effective_to: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}): SerializedPricingRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    origin_iata: row.origin_iata,
    destination_iata: row.destination_iata,
    carrier_iata: row.carrier_iata,
    cabin_class: row.cabin_class,
    commission_percent_override: row.commission_percent_override?.toString() ?? null,
    markup_fixed_override: row.markup_fixed_override,
    max_commission_percent: row.max_commission_percent?.toString() ?? null,
    max_markup_fixed: row.max_markup_fixed,
    effective_from: row.effective_from?.toISOString() ?? null,
    effective_to: row.effective_to?.toISOString() ?? null,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function bodyToData(body: FlightPricingRuleBody): Prisma.FlightPricingRuleUncheckedCreateInput {
  return {
    name: body.name,
    enabled: body.enabled,
    priority: body.priority,
    origin_iata: body.origin_iata ?? null,
    destination_iata: body.destination_iata ?? null,
    carrier_iata: body.carrier_iata ?? null,
    cabin_class: body.cabin_class ?? null,
    commission_percent_override:
      body.commission_percent_override == null
        ? null
        : new Prisma.Decimal(body.commission_percent_override),
    markup_fixed_override: body.markup_fixed_override ?? null,
    max_commission_percent:
      body.max_commission_percent == null
        ? null
        : new Prisma.Decimal(body.max_commission_percent),
    max_markup_fixed: body.max_markup_fixed ?? null,
    effective_from: body.effective_from ? new Date(body.effective_from) : null,
    effective_to: body.effective_to ? new Date(body.effective_to) : null,
    notes: body.notes ?? null,
  };
}

export async function listAdminFlightPricingRules(): Promise<SerializedPricingRule[]> {
  const rows = await prisma.flightPricingRule.findMany({
    orderBy: [{ enabled: "desc" }, { priority: "asc" }, { created_at: "desc" }],
  });
  return rows.map(serialize);
}

export async function getAdminFlightPricingRule(id: string): Promise<SerializedPricingRule> {
  const row = await prisma.flightPricingRule.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Pricing rule not found.", "NOT_FOUND");
  return serialize(row);
}

export async function createAdminFlightPricingRule(
  body: FlightPricingRuleBody,
): Promise<SerializedPricingRule> {
  const row = await prisma.flightPricingRule.create({ data: bodyToData(body) });
  return serialize(row);
}

export async function updateAdminFlightPricingRule(
  id: string,
  body: FlightPricingRuleBody,
): Promise<SerializedPricingRule> {
  try {
    const row = await prisma.flightPricingRule.update({
      where: { id },
      data: bodyToData(body),
    });
    return serialize(row);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new AppError(404, "Pricing rule not found.", "NOT_FOUND");
    }
    throw e;
  }
}

export async function deleteAdminFlightPricingRule(id: string): Promise<void> {
  try {
    await prisma.flightPricingRule.delete({ where: { id } });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      throw new AppError(404, "Pricing rule not found.", "NOT_FOUND");
    }
    throw e;
  }
}
