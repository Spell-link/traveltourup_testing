import { describe, expect, it } from "vitest";
import { stableFlightSearchBodyKey } from "@/lib/flights/flight-search-body-stable";
import type { FlightSearchBody } from "@/lib/validations/flights.schema";

const baseBody: FlightSearchBody = {
  slices: [
    {
      origin: "LHR",
      destination: "JFK",
      departure_date: "2026-06-01",
    },
  ],
  passengers: [{ type: "adult" }],
  cabin_class: "economy",
  sort: "price_asc",
  limit: 50,
};

describe("stableFlightSearchBodyKey", () => {
  it("excludes sort so sort-only changes share the same cache key", () => {
    const a = stableFlightSearchBodyKey({ ...baseBody, sort: "price_asc" });
    const b = stableFlightSearchBodyKey({ ...baseBody, sort: "duration_asc" });
    expect(a).toBe(b);
  });

  it("includes route and cabin in the key", () => {
    const a = stableFlightSearchBodyKey(baseBody);
    const b = stableFlightSearchBodyKey({
      ...baseBody,
      slices: [{ origin: "LHR", destination: "CDG", departure_date: "2026-06-01" }],
    });
    expect(a).not.toBe(b);
  });
});

describe("changeSearchMatchesSession", () => {
  it("matches when session fields align with URL params", async () => {
    const { changeSearchMatchesSession } = await import("@/lib/flights/flights-change-page-layout");
    expect(
      changeSearchMatchesSession(
        {
          origin: "LHR",
          destination: "JFK",
          departure_date: "2026-06-01",
          slice_id: "sli_123",
          cabin_class: "economy",
          adults: "1",
          children: "0",
          infants: "0",
        },
        {
          selectedSliceId: "sli_123",
          origin: "LHR",
          destination: "JFK",
          departureDate: "2026-06-01",
          cabinClass: "economy",
        },
      ),
    ).toBe(true);
  });
});
