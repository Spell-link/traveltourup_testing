import { describe, expect, it } from "vitest";
import {
  assertPassengersMatchOffer,
  flightCheckoutBookingBodySchema,
  flightCheckoutValidateBodySchema,
} from "@/lib/validations/flight-checkout.schema";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const sampleOffer = (pas: string[]): FlightOfferDTO => ({
  id: "off_x",
  total_amount: "100.00",
  total_currency: "USD",
  expires_at: null,
  live_mode: false,
  slices: [],
  passengers: pas.map((id) => ({ id, type: "adult" })),
  available_services: [],
  passenger_identity_documents_required: false,
  supported_passenger_identity_document_types: [],
});

const sampleContact = {
  email: "j@example.com",
  phone_number: "+442080160509",
};

describe("flightCheckoutBookingBodySchema", () => {
  it("accepts a minimal valid body", () => {
    const parsed = flightCheckoutBookingBodySchema.safeParse({
      offer_id: "off_abc",
      payment_intent_id: "pit_xyz",
      contact: sampleContact,
      passengers: [
        {
          passenger_id: "pas_1",
          title: "mr",
          given_name: "John",
          family_name: "Doe",
          born_on: "1990-01-15",
          gender: "m",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts hold without payment intent", () => {
    const parsed = flightCheckoutBookingBodySchema.safeParse({
      offer_id: "off_abc",
      order_mode: "hold",
      contact: sampleContact,
      passengers: [
        {
          passenger_id: "pas_1",
          title: "mr",
          given_name: "John",
          family_name: "Doe",
          born_on: "1990-01-15",
          gender: "m",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects pay_now without payment intent", () => {
    const parsed = flightCheckoutBookingBodySchema.safeParse({
      offer_id: "off_abc",
      order_mode: "pay_now",
      contact: sampleContact,
      passengers: [
        {
          passenger_id: "pas_1",
          title: "mr",
          given_name: "John",
          family_name: "Doe",
          born_on: "1990-01-15",
          gender: "m",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("flightCheckoutValidateBodySchema", () => {
  it("accepts passenger payload without payment_intent_id", () => {
    const parsed = flightCheckoutValidateBodySchema.safeParse({
      offer_id: "off_abc",
      contact: sampleContact,
      passengers: [
        {
          passenger_id: "pas_1",
          title: "mr",
          given_name: "John",
          family_name: "Doe",
          born_on: "1990-01-15",
          gender: "m",
        },
      ],
      search_session_id: "sess_abc",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts incomplete passenger rows for pre-payment validation", () => {
    const parsed = flightCheckoutValidateBodySchema.safeParse({
      offer_id: "off_abc",
      contact: { email: "dev@test.com", phone_number: "+92 3233123210" },
      passengers: [
        {
          passenger_id: "pas_1",
          given_name: "Spell",
          family_name: "Link",
        },
        {
          passenger_id: "pas_2",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("assertPassengersMatchOffer", () => {
  it("throws when counts differ", () => {
    const offer = sampleOffer(["pas_a", "pas_b"]);
    expect(() =>
      assertPassengersMatchOffer(offer, [
        {
          passenger_id: "pas_a",
        },
      ]),
    ).toThrow(/match offer passengers/);
  });
});
