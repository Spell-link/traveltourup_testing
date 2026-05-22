import { describe, expect, it } from "vitest";
import { orderChangeOfferToFlightOfferDto, orderChangeOfferToListDisplay } from "@/lib/flights/order-change-offer-adapter";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";

const sampleOffer: FlightOrderChangeOffer = {
  id: "oco_test",
  change_total_amount: "50.00",
  change_total_currency: "GBP",
  new_total_amount: "100.00",
  new_total_currency: "GBP",
  penalty_total_amount: "25.00",
  penalty_total_currency: "GBP",
  refund_to: null,
  expires_at: "2026-12-31T12:00:00Z",
  itinerary_summary: "ATL → SWF",
  new_slice_summary: null,
  slices: {
    add: [
      {
        id: "sli_new",
        origin: { iata_code: "ATL", name: "Atlanta" },
        destination: { iata_code: "SWF", name: "Stewart" },
        segments: [
          {
            id: "seg_1",
            origin: { iata_code: "ATL", name: "Atlanta" },
            destination: { iata_code: "SWF", name: "Stewart" },
            departing_at: "2026-06-24T23:00:00Z",
            arriving_at: "2026-06-25T01:23:00Z",
            duration: "PT2H23M",
            marketing_carrier: { iata_code: "ZZ", name: "Duffel Airways" },
            marketing_carrier_flight_number: "5901",
          },
        ],
      },
    ],
  },
};

describe("order-change-offer-adapter", () => {
  it("maps slices.add to FlightOfferDTO", () => {
    const dto = orderChangeOfferToFlightOfferDto(sampleOffer);
    expect(dto).not.toBeNull();
    expect(dto!.id).toBe("oco_test");
    expect(dto!.slices).toHaveLength(1);
    expect(dto!.slices[0]!.segments[0]!.origin_iata).toBe("ATL");
    expect(dto!.slices[0]!.segments[0]!.departing_at).toContain("2026-06-24");
  });

  it("produces list display with real times not placeholders", () => {
    const row = orderChangeOfferToListDisplay(sampleOffer);
    expect(row.departureTime).not.toBe("--:--");
    expect(row.arrivalTime).not.toBe("--:--");
    expect(row.changeDelta).toBe(50);
    expect(row.departureAirport).toBe("ATL");
    expect(row.arrivalAirport).toBe("SWF");
  });
});
