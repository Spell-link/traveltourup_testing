import { describe, expect, it } from "vitest";
import {
  checkoutPaymentRecordIdSchema,
  customerCurrencySchema,
  duffelQuoteIdSchema,
  idempotencyKeyHeaderSchema,
} from "./checkout-payment.schema";
import { staysCheckoutPrepareResponseSchema } from "./stays.schema";
import {
  staysBookingBodySchema,
  staysCheckoutPrepareBodySchema,
  staysQuoteBodySchema,
  staysSearchBodySchema,
} from "./stays.schema";

describe("checkout-payment.schema", () => {
  it("accepts valid quote id prefix", () => {
    expect(duffelQuoteIdSchema.safeParse("quo_0000AS0NZdKjjnnHZmSUbI").success).toBe(true);
    expect(duffelQuoteIdSchema.safeParse("rat_123").success).toBe(false);
  });

  it("accepts supported customer currencies", () => {
    expect(customerCurrencySchema.safeParse("USD").success).toBe(true);
    expect(customerCurrencySchema.safeParse("GBP").success).toBe(false);
  });

  it("rejects idempotency keys over 128 chars", () => {
    expect(idempotencyKeyHeaderSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("staysSearchBodySchema", () => {
  it("accepts a valid search body", () => {
    const r = staysSearchBodySchema.safeParse({
      check_in_date: "2026-05-01",
      check_out_date: "2026-05-03",
      rooms: 1,
      guests: [{ type: "adult" }, { type: "adult" }],
      location: { latitude: 51.5, longitude: -0.12, radius: 10 },
    });
    expect(r.success).toBe(true);
  });
});

describe("staysQuoteBodySchema", () => {
  it("accepts rate_id", () => {
    const r = staysQuoteBodySchema.safeParse({ rate_id: "rat_0000BTVRuKZTavzrZDJ4cb" });
    expect(r.success).toBe(true);
  });
});

describe("staysCheckoutPrepareBodySchema", () => {
  it("accepts quote_id with optional currency", () => {
    const r = staysCheckoutPrepareBodySchema.safeParse({
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      customer_currency: "EUR",
    });
    expect(r.success).toBe(true);
  });
});

describe("staysBookingBodySchema", () => {
  it("requires E.164 phone and checkout_payment_id", () => {
    const base = {
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      checkout_payment_id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      email: "a@b.com",
      guests: [{ given_name: "Ada", family_name: "Lovelace", born_on: "1990-01-01" }],
    };
    expect(
      staysBookingBodySchema.safeParse({ ...base, phone_number: "02080160509" }).success,
    ).toBe(false);
    expect(
      staysBookingBodySchema.safeParse({ ...base, phone_number: "+442080160509" }).success,
    ).toBe(true);
  });

  it("rejects future born_on", () => {
    const r = staysBookingBodySchema.safeParse({
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      checkout_payment_id: "clh3abc123456789012345678",
      email: "a@b.com",
      phone_number: "+442080160509",
      guests: [{ given_name: "A", family_name: "B", born_on: "2099-01-01" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("staysCheckoutPrepareResponseSchema", () => {
  it("rejects malformed pricing", () => {
    const r = staysCheckoutPrepareResponseSchema.safeParse({
      checkout_payment_id: "clh3abc123456789012345678",
      client_secret: "pi_secret",
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      expires_at: null,
      pricing: {
        supplier_amount: "not-a-number",
        supplier_currency: "USD",
        markup_amount: "5.00",
        customer_total: "125.00",
        charge_currency: "USD",
        charge_currency_fallback: false,
      },
    });
    expect(r.success).toBe(false);
  });
});
