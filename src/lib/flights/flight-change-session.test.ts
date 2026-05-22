import { describe, expect, it } from "vitest";

import {
  parseChangeDelta,
  sortChangeOffersByCost,
} from "@/lib/flights/flight-change-session";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";

const offer = (id: string, amount: string): FlightOrderChangeOffer => ({
  id,
  change_total_amount: amount,
  change_total_currency: "USD",
  new_total_amount: null,
  new_total_currency: null,
  penalty_total_amount: null,
  penalty_total_currency: null,
  refund_to: null,
  expires_at: null,
  itinerary_summary: null,
  new_slice_summary: null,
});

describe("sortChangeOffersByCost", () => {
  it("sorts ascending by change_total_amount", () => {
    const sorted = sortChangeOffersByCost([
      offer("b", "50"),
      offer("a", "10"),
      offer("c", "125"),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });
});

describe("parseChangeDelta", () => {
  it("parses numeric delta", () => {
    expect(parseChangeDelta(offer("x", "42.50"))).toBe(42.5);
    expect(parseChangeDelta(offer("x", "-10"))).toBe(-10);
  });
});
