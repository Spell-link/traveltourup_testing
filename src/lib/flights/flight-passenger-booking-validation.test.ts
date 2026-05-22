import { describe, expect, it } from "vitest";
import { collectFlightPassengerBookingIssues } from "./flight-passenger-booking-validation";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const baseOffer: FlightOfferDTO = {
  id: "off_intl",
  total_amount: "500",
  total_currency: "USD",
  expires_at: null,
  live_mode: false,
  slices: [
    {
      id: "sli_1",
      origin_iata: "DXB",
      destination_iata: "JFK",
      stops_count: 0,
      segments: [
        {
          id: "seg_1",
          origin_iata: "DXB",
          destination_iata: "JFK",
          origin_name: "",
          destination_name: "",
          origin_terminal: null,
          destination_terminal: null,
          departing_at: "2026-05-30T10:00:00Z",
          arriving_at: "2026-06-30T22:00:00Z",
          duration: null,
          marketing_carrier_iata: null,
          operating_carrier_iata: null,
          marketing_carrier_name: null,
          operating_carrier_name: null,
          marketing_carrier_logo_url: null,
          flight_number: null,
          cabin_class: null,
          fare_brand_name: null,
        },
      ],
    },
  ],
  passengers: [{ id: "pas_1", type: "adult" }],
  available_services: [],
  passenger_identity_documents_required: true,
  supported_passenger_identity_document_types: ["passport"],
};

const contact = {
  email: "a@b.com",
  phone_number: "+442080160509",
};

describe("collectFlightPassengerBookingIssues passport", () => {
  it("blocks passport expiry before travel end", () => {
    const passengers = [
      {
        passenger_id: "pas_1",
        title: "mr" as const,
        given_name: "Test",
        family_name: "User",
        born_on: "1990-01-01",
        gender: "m" as const,
        identity_documents: [
          {
            type: "passport" as const,
            unique_identifier: "AB123456",
            issuing_country_code: "GB",
            expires_on: "2026-06-01",
          },
        ],
      },
    ];

    const issues = collectFlightPassengerBookingIssues(baseOffer, passengers, { contact });
    expect(issues.some((i) => i.code === "passport_expires_before_travel_end")).toBe(true);
  });

  it("requires E.164 phone on collective contact", () => {
    const passengers = [
      {
        passenger_id: "pas_1",
        title: "mr" as const,
        given_name: "Test",
        family_name: "User",
        born_on: "1990-01-01",
        gender: "m" as const,
      },
    ];

    const issues = collectFlightPassengerBookingIssues(baseOffer, passengers, {
      contact: { email: "a@b.com", phone_number: "02080160509" },
    });
    expect(issues.some((i) => i.code === "lead_phone_e164")).toBe(true);
    expect(issues.find((i) => i.code === "lead_phone_e164")?.path).toEqual(["contact", "phone_number"]);
  });

  it("accepts spaced phone numbers after normalization", () => {
    const passengers = [
      {
        passenger_id: "pas_1",
        title: "mr" as const,
        given_name: "Test",
        family_name: "User",
        born_on: "1990-01-01",
        gender: "m" as const,
        identity_documents: [
          {
            type: "passport" as const,
            unique_identifier: "AB123456",
            issuing_country_code: "GB",
            expires_on: "2030-01-01",
          },
        ],
      },
    ];

    const issues = collectFlightPassengerBookingIssues(baseOffer, passengers, {
      contact: { email: "a@b.com", phone_number: "+92 3233123210" },
    });
    expect(issues.some((i) => i.code === "lead_phone_e164")).toBe(false);
  });
});

describe("collectFlightPassengerBookingIssues infant", () => {
  const familyOffer: FlightOfferDTO = {
    ...baseOffer,
    passengers: [
      { id: "pas_adult_1", type: "adult" },
      { id: "pas_adult_2", type: "adult" },
      { id: "pas_child_1", type: "child" },
      { id: "pas_infant_1", type: "infant_without_seat" },
    ],
  };

  const contact = { email: "a@b.com", phone_number: "+442080160509" };

  it("accepts a valid accompanying adult for infant_without_seat", () => {
    const passengers = [
      {
        passenger_id: "pas_adult_1",
        title: "mr" as const,
        given_name: "Adult",
        family_name: "One",
        born_on: "1990-01-01",
        gender: "m" as const,
      },
      {
        passenger_id: "pas_adult_2",
        title: "mrs" as const,
        given_name: "Adult",
        family_name: "Two",
        born_on: "1992-01-01",
        gender: "f" as const,
      },
      {
        passenger_id: "pas_child_1",
        title: "mr" as const,
        given_name: "Child",
        family_name: "One",
        born_on: "2017-01-01",
        gender: "m" as const,
      },
      {
        passenger_id: "pas_infant_1",
        title: "mr" as const,
        given_name: "Baby",
        family_name: "One",
        born_on: "2024-01-01",
        gender: "m" as const,
        accompanying_adult_id: "pas_adult_2",
      },
    ];

    const issues = collectFlightPassengerBookingIssues(familyOffer, passengers, { contact });
    expect(issues.some((i) => i.code === "infant_adult_invalid")).toBe(false);
    expect(issues.some((i) => i.code === "infant_adult_required")).toBe(false);
  });
});
