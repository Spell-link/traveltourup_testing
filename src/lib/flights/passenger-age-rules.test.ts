import { describe, expect, it } from "vitest";
import { validatePassengerAgesForOffer } from "./passenger-age-rules";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

const roundTripOffer: FlightOfferDTO = {
  id: "off_rt",
  total_amount: "100",
  total_currency: "USD",
  expires_at: null,
  live_mode: false,
  passengers: [{ id: "pas_child", type: "child" }],
  available_services: [],
  passenger_identity_documents_required: false,
  supported_passenger_identity_document_types: [],
  slices: [
    {
      id: "s1",
      origin_iata: "DXB",
      destination_iata: "JFK",
      stops_count: 0,
      segments: [
        {
          id: "seg1",
          origin_iata: "DXB",
          destination_iata: "JFK",
          origin_name: "",
          destination_name: "",
          origin_terminal: null,
          destination_terminal: null,
          departing_at: "2026-05-30T10:00:00Z",
          arriving_at: "2026-05-30T22:00:00Z",
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
    {
      id: "s2",
      origin_iata: "JFK",
      destination_iata: "DXB",
      stops_count: 0,
      segments: [
        {
          id: "seg2",
          origin_iata: "JFK",
          destination_iata: "DXB",
          origin_name: "",
          destination_name: "",
          origin_terminal: null,
          destination_terminal: null,
          departing_at: "2026-06-30T10:00:00Z",
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
};

describe("validatePassengerAgesForOffer", () => {
  it("flags child age mismatch at return departure", () => {
    const issues = validatePassengerAgesForOffer(
      roundTripOffer,
      [
        {
          passenger_id: "pas_child",
          title: "mr",
          given_name: "Kid",
          family_name: "Test",
          born_on: "2003-12-12",
          gender: "m",
        },
      ],
      [{ type: "child", age: 11 }],
    );
    expect(issues.some((i) => i.code === "child_age_mismatch_return")).toBe(true);
  });
});
