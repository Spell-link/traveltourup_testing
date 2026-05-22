import { describe, expect, it } from "vitest";
import { toDuffelOrderPassengers, resolveLeadContact } from "./duffel-order-passengers";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";

const offer: FlightOfferDTO = {
  id: "off_test",
  total_amount: "100",
  total_currency: "USD",
  expires_at: null,
  live_mode: false,
  slices: [],
  passengers: [
    { id: "pas_1", type: "adult" },
    { id: "pas_2", type: "adult" },
    { id: "pas_3", type: "child" },
    { id: "pas_4", type: "adult" },
  ],
  available_services: [],
  passenger_identity_documents_required: false,
  supported_passenger_identity_document_types: [],
};

const contact = {
  email: "lead@test.com",
  phone_number: "+442080160509",
};

function pax(id: string, extra?: Partial<FlightCheckoutBookingBody["passengers"][0]>) {
  return {
    passenger_id: id,
    title: "mr" as const,
    given_name: "Test",
    family_name: "User",
    born_on: "1990-01-01",
    gender: "m" as const,
    ...extra,
  };
}

describe("toDuffelOrderPassengers", () => {
  it("propagates collective contact to all passengers", () => {
    const passengers: FlightCheckoutBookingBody["passengers"] = [
      pax("pas_1"),
      pax("pas_2"),
      pax("pas_3", { born_on: "2015-06-01" }),
      pax("pas_4"),
    ];

    const mapped = toDuffelOrderPassengers(passengers, offer, contact);

    expect(mapped).toHaveLength(4);
    for (const row of mapped) {
      expect(row.email).toBe("lead@test.com");
      expect(row.phone_number).toBe("+442080160509");
    }
  });

  it("uses explicit contact over legacy passenger rows", () => {
    const passengers: FlightCheckoutBookingBody["passengers"] = [
      pax("pas_1"),
      pax("pas_2", { email: "legacy@test.com", phone_number: "+12025550100" } as never),
      pax("pas_3", { born_on: "2015-06-01" }),
      pax("pas_4"),
    ];

    const lead = resolveLeadContact(passengers, offer, contact);
    expect(lead?.email).toBe("lead@test.com");
    expect(lead?.phone_number).toBe("+442080160509");
  });
});
