import { describe, expect, it } from "vitest";

import { buildOriginalBookingContext } from "@/lib/flights/build-original-booking-context";

describe("buildOriginalBookingContext", () => {
  it("maps booking snapshot and slice options", () => {
    const ctx = buildOriginalBookingContext({
      booking: {
        id: "bk_1",
        booking_ref_no: "TTU-1",
        total_amount: "97.26",
        currency: "USD",
        status: "confirmed",
        flight_booking: {
          itinerary_snapshot: {
            id: "off_1",
            slices: [
              {
                id: "sli_1",
                origin_iata: "LHE",
                destination_iata: "DXB",
                segments: [
                  {
                    origin_iata: "LHE",
                    destination_iata: "DXB",
                    departing_at: "2026-05-22T16:15:00",
                    arriving_at: "2026-05-22T18:28:00",
                    marketing_carrier_name: "ZZ",
                    flight_number: "4422",
                    cabin_class: "economy",
                  },
                ],
              },
            ],
            passengers: [{ id: "pas_1", type: "adult" }],
            total_amount: "97.26",
            total_currency: "USD",
          },
          order_raw: {
            available_actions: ["change", "cancel"],
            conditions: { change_before_departure: { allowed: true } },
            slices: [
              {
                id: "sli_1",
                origin: { iata_code: "LHE" },
                destination: { iata_code: "DXB" },
                segments: [{ departing_at: "2026-05-22T16:15:00", cabin_class: "economy" }],
              },
            ],
          },
        },
      } as never,
      changeContext: {
        booking_id: "bk_1",
        duffel_order_id: "ord_1",
        slices: [
          {
            slice_id: "sli_1",
            origin_iata: "LHE",
            destination_iata: "DXB",
            departure_date: "2026-05-22",
            cabin_class: "economy",
            label: "LHE → DXB",
          },
        ],
        changeable: true,
        change_allowed: true,
        change_policy_message: "This order is changeable",
      },
    });

    expect(ctx?.bookingId).toBe("bk_1");
    expect(ctx?.selectedSliceId).toBe("sli_1");
    expect(ctx?.changePolicy.allowed).toBe(true);
    expect(ctx?.flight.departureAirport).toBe("LHE");
  });
});
