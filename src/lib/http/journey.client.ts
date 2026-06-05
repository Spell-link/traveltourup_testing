import { apiJson } from "@/lib/http/api-client";

import type { JourneyTripSnapshot } from "@/lib/journey/journey-trip-snapshot";

export type PostJourneyEventBody = {
  event_type: string;
  product_type: "flight" | "hotel" | "car";
  product_ref: string;
  stage: string;
  properties?: Record<string, unknown>;
  client_event_id?: string;
  title?: string;
  subtitle?: string;
  price_amount?: string;
  price_currency?: string;
  search_context?: Record<string, unknown>;
  trip_snapshot?: Partial<JourneyTripSnapshot>;
  preserve_stage?: boolean;
};

export async function postJourneyEvent(body: PostJourneyEventBody): Promise<void> {
  await apiJson<{ ok: boolean }>("/api/v1/journey/events", {
    method: "POST",
    body,
  });
}

/** Fire-and-forget client-side journey event. */
export function trackClientJourneyEvent(body: PostJourneyEventBody): void {
  void postJourneyEvent(body).catch(() => undefined);
}
