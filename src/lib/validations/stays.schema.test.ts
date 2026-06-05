import { describe, expect, it } from "vitest";
import {
  staysBookingBodySchema,
  staysQuoteBodySchema,
  staysSearchBodySchema,
} from "./stays.schema";

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

  it("rejects bad date format", () => {
    const r = staysSearchBodySchema.safeParse({
      check_in_date: "01-05-2026",
      check_out_date: "2026-05-03",
      rooms: 1,
      guests: [{ type: "adult" }],
      location: { latitude: 0, longitude: 0, radius: 5 },
    });
    expect(r.success).toBe(false);
  });
});

describe("staysQuoteBodySchema", () => {
  it("accepts rate_id", () => {
    const r = staysQuoteBodySchema.safeParse({ rate_id: "rat_0000BTVRuKZTavzrZDJ4cb" });
    expect(r.success).toBe(true);
  });
});

describe("staysBookingBodySchema", () => {
  it("requires E.164 phone and checkout_payment_id", () => {
    const base = {
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      checkout_payment_id: "clh3abc123456789012345678",
      email: "a@b.com",
      guests: [{ given_name: "A", family_name: "B", born_on: "1990-01-01" }],
    };
    const bad = staysBookingBodySchema.safeParse({
      ...base,
      phone_number: "02080160509",
    });
    expect(bad.success).toBe(false);

    const good = staysBookingBodySchema.safeParse({
      ...base,
      phone_number: "+442080160509",
    });
    expect(good.success).toBe(true);
  });

  it("accepts multiple guests and optional loyalty", () => {
    const r = staysBookingBodySchema.safeParse({
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      checkout_payment_id: "clh3abc123456789012345678",
      email: "lead@example.com",
      phone_number: "+442080160509",
      guests: [
        { given_name: "Amelia", family_name: "Earhart", born_on: "1987-07-24" },
        { given_name: "Fred", family_name: "Noonan" },
      ],
      loyalty_programme_account_number: "201154908",
    });
    expect(r.success).toBe(true);
  });

  it("rejects lead guest under 18", () => {
    const r = staysBookingBodySchema.safeParse({
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      checkout_payment_id: "clh3abc123456789012345678",
      email: "a@b.com",
      phone_number: "+442080160509",
      guests: [{ given_name: "Minor", family_name: "Guest", born_on: "2015-01-01" }],
    });
    expect(r.success).toBe(false);
  });
});
