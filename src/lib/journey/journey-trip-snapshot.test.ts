import { describe, expect, it } from "vitest";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  buildFlightTripSnapshot,
  formatOutreachSummary,
  formatRouteLabel,
  formatTravelersSummary,
  mergeTripSnapshots,
} from "@/lib/journey/journey-trip-snapshot";
import { denormFieldsFromSnapshot } from "@/lib/journey/journey-snapshot-denorm";

const MOCK_OFFER: FlightOfferDTO = {
  id: "off_test",
  total_amount: "450.00",
  total_currency: "USD",
  expires_at: "2026-12-31T23:59:59Z",
  live_mode: false,
  slices: [
    {
      id: "s1",
      origin_iata: "JFK",
      destination_iata: "LHR",
      stops_count: 0,
      segments: [
        {
          id: "seg1",
          origin_iata: "JFK",
          destination_iata: "LHR",
          origin_name: "New York",
          destination_name: "London",
          origin_terminal: null,
          destination_terminal: null,
          departing_at: "2026-07-01T10:00:00Z",
          arriving_at: "2026-07-01T22:00:00Z",
          duration: "PT7H",
          marketing_carrier_iata: "BA",
          operating_carrier_iata: "BA",
          marketing_carrier_name: "British Airways",
          operating_carrier_name: "British Airways",
          marketing_carrier_logo_url: null,
          flight_number: "112",
          cabin_class: "economy",
          fare_brand_name: null,
        },
      ],
    },
    {
      id: "s2",
      origin_iata: "LHR",
      destination_iata: "JFK",
      stops_count: 0,
      segments: [
        {
          id: "seg2",
          origin_iata: "LHR",
          destination_iata: "JFK",
          origin_name: "London",
          destination_name: "New York",
          origin_terminal: null,
          destination_terminal: null,
          departing_at: "2026-07-10T10:00:00Z",
          arriving_at: null,
          duration: "PT8H",
          marketing_carrier_iata: "BA",
          operating_carrier_iata: "BA",
          marketing_carrier_name: "British Airways",
          operating_carrier_name: "British Airways",
          marketing_carrier_logo_url: null,
          flight_number: "113",
          cabin_class: "economy",
          fare_brand_name: null,
        },
      ],
    },
  ],
  passengers: [
    { id: "p1", type: "adult" },
    { id: "p2", type: "adult" },
    { id: "p3", type: "child" },
  ],
  available_services: [],
  passenger_identity_documents_required: false,
  supported_passenger_identity_document_types: [],
};

describe("mergeTripSnapshots", () => {
  it("fills gaps without overwriting existing values", () => {
    const base = {
      version: 1,
      product_type: "flight" as const,
      product_ref: "off_1",
      origin_label: "JFK",
      start_date: "2026-07-01",
    };
    const merged = mergeTripSnapshots(base, {
      destination_label: "LHR",
      start_date: "2026-08-01",
      adults: 2,
    });
    expect(merged.origin_label).toBe("JFK");
    expect(merged.destination_label).toBe("LHR");
    expect(merged.start_date).toBe("2026-07-01");
    expect(merged.adults).toBe(2);
  });

  it("ignores empty string patches", () => {
    const merged = mergeTripSnapshots(
      { version: 1, product_type: "hotel", product_ref: "srr_1", hotel_name: "Grand" },
      { hotel_name: "" },
    );
    expect(merged.hotel_name).toBe("Grand");
  });
});

describe("buildFlightTripSnapshot", () => {
  it("captures route, dates, travelers, and trip type", () => {
    const snap = buildFlightTripSnapshot(MOCK_OFFER, { productRef: "off_test" });
    expect(snap.trip_type).toBe("round_trip");
    expect(snap.origin_code).toBe("JFK");
    expect(snap.destination_code).toBe("LHR");
    expect(snap.start_date).toBe("2026-07-01");
    expect(snap.end_date).toBe("2026-07-10");
    expect(snap.adults).toBe(2);
    expect(snap.children).toBe(1);
    expect(formatRouteLabel(snap)).toContain("→");
  });
});

describe("denormFieldsFromSnapshot", () => {
  it("maps flight snapshot to list columns", () => {
    const snap = buildFlightTripSnapshot(MOCK_OFFER, { productRef: "off_test" });
    const denorm = denormFieldsFromSnapshot(snap);
    expect(denorm.origin_label).toBeTruthy();
    expect(denorm.destination_label).toBeTruthy();
    expect(denorm.start_date).toBe("2026-07-01");
    expect(denorm.travelers_summary).toContain("adult");
  });
});

describe("formatOutreachSummary", () => {
  it("produces a support-ready flight blurb", () => {
    const snap = buildFlightTripSnapshot(MOCK_OFFER, { productRef: "off_test" });
    const text = formatOutreachSummary(snap, "checkout_started");
    expect(text).toContain("Customer viewed");
    expect(text).toContain("checkout started");
    expect(formatTravelersSummary(snap)).toContain("2 adults");
  });
});
