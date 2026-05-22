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
  it("requires E.164 phone", () => {
    const base = {
      quote_id: "quo_0000AS0NZdKjjnnHZmSUbI",
      payment: { three_d_secure_session_id: "tds_test" },
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
});
