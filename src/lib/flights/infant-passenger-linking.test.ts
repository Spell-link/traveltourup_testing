import { describe, expect, it } from "vitest";
import {
  buildAdultToInfantDuffelLink,
  duffelPassengersMissingInfantLinks,
  isInfantPassengerType,
  resolveInfantToAccompanyingAdultMap,
} from "./infant-passenger-linking";
import { toDuffelOrderPassengers } from "./duffel-order-passengers";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const offer: FlightOfferDTO = {
  id: "off_test",
  total_amount: "100",
  total_currency: "USD",
  expires_at: null,
  live_mode: false,
  slices: [],
  passengers: [
    { id: "pas_adult_1", type: "adult" },
    { id: "pas_adult_2", type: "adult" },
    { id: "pas_infant_1", type: "infant_without_seat" },
  ],
  available_services: [],
  passenger_identity_documents_required: false,
  supported_passenger_identity_document_types: [],
};

describe("infant-passenger-linking", () => {
  it("detects infant_without_seat type", () => {
    expect(isInfantPassengerType("infant_without_seat")).toBe(true);
    expect(isInfantPassengerType("infant")).toBe(true);
    expect(isInfantPassengerType("adult")).toBe(false);
  });

  it("auto-assigns infants to adults round-robin", () => {
    const map = resolveInfantToAccompanyingAdultMap(offer, [
      { passenger_id: "pas_adult_1" },
      { passenger_id: "pas_adult_2" },
      { passenger_id: "pas_infant_1" },
    ]);
    expect(map.get("pas_infant_1")).toBe("pas_adult_1");
  });

  it("maps adult to infant for Duffel API shape", () => {
    const infantToAdult = new Map([["pas_infant_1", "pas_adult_1"]]);
    expect(buildAdultToInfantDuffelLink(infantToAdult).get("pas_adult_1")).toBe("pas_infant_1");
  });
});

describe("toDuffelOrderPassengers infant linking", () => {
  const contact = { email: "lead@test.com", phone_number: "+442080160509" };

  it("sets infant_passenger_id on the adult, not the infant", () => {
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
        title: "mr" as const,
        given_name: "Adult",
        family_name: "Two",
        born_on: "1992-01-01",
        gender: "m" as const,
      },
      {
        passenger_id: "pas_infant_1",
        title: "mr" as const,
        given_name: "Baby",
        family_name: "One",
        born_on: "2025-01-01",
        gender: "m" as const,
        accompanying_adult_id: "pas_adult_2",
      },
    ];

    const mapped = toDuffelOrderPassengers(passengers, offer, contact);
    const adult2 = mapped.find((r) => r.id === "pas_adult_2");
    const infant = mapped.find((r) => r.id === "pas_infant_1");

    expect(adult2?.infant_passenger_id).toBe("pas_infant_1");
    expect(infant?.infant_passenger_id).toBeUndefined();
  });

  it("flags missing infant links before order create", () => {
    const mapped = toDuffelOrderPassengers(
      [
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
          title: "mr" as const,
          given_name: "Adult",
          family_name: "Two",
          born_on: "1992-01-01",
          gender: "m" as const,
        },
        {
          passenger_id: "pas_infant_1",
          title: "mr" as const,
          given_name: "Baby",
          family_name: "One",
          born_on: "2025-01-01",
          gender: "m" as const,
        },
      ],
      offer,
      contact,
    );

    expect(duffelPassengersMissingInfantLinks(offer, mapped)).toBe(false);
  });
});
