import { describe, expect, it } from "vitest";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import { resolveFlightCheckoutDisplayPricing } from "./flight-checkout-display-pricing";

function minimalOffer(overrides?: Partial<FlightOfferDTO>): FlightOfferDTO {
  return {
    id: "off_test",
    total_amount: "169.09",
    total_currency: "USD",
    expires_at: null,
    live_mode: false,
    slices: [],
    passengers: [{ id: "pas_1", type: "adult" }],
    available_services: [
      {
        id: "ase_bag",
        total_amount: "30.00",
        total_currency: "USD",
        type: "baggage",
        maximum_quantity: 1,
      },
    ],
    passenger_identity_documents_required: false,
    supported_passenger_identity_document_types: [],
    ...overrides,
  };
}

const seatMapsWith40: SeatMapDTO[] = [
  {
    id: "sm1",
    segment_id: "seg1",
    slice_id: null,
    cabins: [
      {
        cabin_class: "economy",
        deck: 0,
        aisles: 1,
        rows: [
          {
            sections: [
              {
                elements: [
                  {
                    type: "seat",
                    designator: "1A",
                    disclosures: [],
                    services: [
                      {
                        id: "ase_seat",
                        passenger_id: "pas_1",
                        total_amount: "40.00",
                        total_currency: "USD",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

describe("resolveFlightCheckoutDisplayPricing", () => {
  it("prefers bookingDetails price over offer fare when no chargePricing", () => {
    const offer = minimalOffer();
    const result = resolveFlightCheckoutDisplayPricing({
      offer,
      bagQuantities: { ase_bag: 1 },
      seatSelections: { "seg1::pas_1": "ase_seat" },
      seatMaps: seatMapsWith40,
      bookingDetailsPriceLine: "USD 209.09",
    });
    expect(result).not.toBeNull();
    expect(result!.primaryAmount).toBe(209.09);
    expect(result!.primarySource).toBe("booking_details");
    expect(result!.base).toBe(169.09);
    expect(result!.extrasSubtotal).toBeCloseTo(40, 2);
  });

  it("uses chargePricing when present", () => {
    const offer = minimalOffer();
    const result = resolveFlightCheckoutDisplayPricing({
      offer,
      bagQuantities: {},
      seatSelections: {},
      seatMaps: null,
      bookingDetailsPriceLine: "USD 209.09",
      chargePricing: { amount: "215.50", currency: "USD" },
    });
    expect(result!.primaryAmount).toBe(215.5);
    expect(result!.primarySource).toBe("charge");
  });

  it("estimates from bags and seats when no persisted booking line", () => {
    const offer = minimalOffer();
    const result = resolveFlightCheckoutDisplayPricing({
      offer,
      bagQuantities: { ase_bag: 1 },
      seatSelections: { "seg1::pas_1": "ase_seat" },
      seatMaps: seatMapsWith40,
    });
    expect(result!.primarySource).toBe("estimate");
    expect(result!.base).toBe(169.09);
    expect(result!.extrasSubtotal).toBe(70);
    expect(result!.primaryAmount).toBeCloseTo(239.09, 2);
  });

  it("falls back to fare only when no extras", () => {
    const offer = minimalOffer();
    const result = resolveFlightCheckoutDisplayPricing({
      offer,
      bagQuantities: { ase_bag: 0 },
      seatSelections: {},
      seatMaps: null,
    });
    expect(result!.primarySource).toBe("fare");
    expect(result!.primaryAmount).toBe(169.09);
    expect(result!.extrasSubtotal).toBe(0);
  });
});
