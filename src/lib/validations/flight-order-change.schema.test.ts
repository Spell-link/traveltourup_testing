import { describe, expect, it } from "vitest";

import {
  flightOrderChangeConfirmBodySchema,
  flightOrderChangePaymentIntentBodySchema,
  flightOrderChangeQuoteBodySchema,
} from "@/lib/validations/flight-order-change.schema";

describe("flightOrderChangeQuoteBodySchema", () => {
  it("accepts explicit slices with remove + add", () => {
    const parsed = flightOrderChangeQuoteBodySchema.safeParse({
      slices: {
        remove: [{ slice_id: "sli_1" }],
        add: [
          {
            origin: "JFK",
            destination: "LHR",
            departure_date: "2026-06-20",
            cabin_class: "economy",
          },
        ],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts selected_slice_id shortcut", () => {
    const parsed = flightOrderChangeQuoteBodySchema.safeParse({
      selected_slice_id: "sli_1",
      departure_date: "2026-06-20",
      origin: "JFK",
      destination: "LHR",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty slices body", () => {
    const parsed = flightOrderChangeQuoteBodySchema.safeParse({ slices: {} });
    expect(parsed.success).toBe(false);
  });
});

describe("flightOrderChangePaymentIntentBodySchema", () => {
  it("requires offer id", () => {
    expect(
      flightOrderChangePaymentIntentBodySchema.safeParse({
        order_change_offer_id: "oco_1",
      }).success,
    ).toBe(true);
  });
});

describe("flightOrderChangeConfirmBodySchema", () => {
  it("accepts optional payment_intent_id for paid changes", () => {
    const parsed = flightOrderChangeConfirmBodySchema.safeParse({
      order_change_offer_id: "oco_1",
      payment_intent_id: "pit_1",
    });
    expect(parsed.success).toBe(true);
  });
});
