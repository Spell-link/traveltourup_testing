"use client";

import { apiJson } from "@/lib/http/api-client";
import type { FlightPricingRuleBody } from "@/lib/validations/flight-pricing-rule.schema";
import type { SerializedPricingRule } from "@/lib/admin/flight-pricing-rule.types";

const PRICING_RULES_BASE = "/api/v1/admin/flights/pricing-rules";

export async function createFlightPricingRule(
  body: FlightPricingRuleBody,
): Promise<SerializedPricingRule> {
  return apiJson<SerializedPricingRule>(PRICING_RULES_BASE, { method: "POST", body });
}

export async function updateFlightPricingRule(
  id: string,
  body: FlightPricingRuleBody,
): Promise<SerializedPricingRule> {
  return apiJson<SerializedPricingRule>(`${PRICING_RULES_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  });
}

export async function deleteFlightPricingRule(id: string): Promise<void> {
  await apiJson<unknown>(`${PRICING_RULES_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function retryFlightRefund(bookingId: string): Promise<void> {
  await apiJson<{ success?: boolean; message?: string }>(
    `/api/v1/admin/flights/bookings/${encodeURIComponent(bookingId)}/refund-retry`,
    { method: "POST" },
  );
}

export async function compensationRefund(duffelIntentId: string): Promise<void> {
  await apiJson<{ success?: boolean; message?: string }>(
    `/api/v1/admin/flights/payment-intents/${encodeURIComponent(duffelIntentId)}/compensation-refund`,
    { method: "POST" },
  );
}
