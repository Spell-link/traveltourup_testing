import { describe, expect, it } from "vitest";
import {
  buildStaysSearchQueryParams,
  hasStaysSearchInUrl,
  staysSearchFromUrl,
} from "@/lib/hotels/search-from-url";

describe("staysSearchFromUrl", () => {
  it("parses popular destination search", () => {
    const sp = new URLSearchParams({
      stays_results: "1",
      check_in: "2026-06-10",
      check_out: "2026-06-12",
      rooms: "1",
      adults: "2",
      children: "0",
      dest_kind: "popular",
      dest_code: "NYC",
      dest_name: "New York City",
      dest_country: "United States",
    });
    const result = staysSearchFromUrl(sp);
    expect(result).not.toBeNull();
    expect(result!.apiBody.check_in_date).toBe("2026-06-10");
    expect(result!.apiBody.location.latitude).toBeCloseTo(40.7128, 2);
    expect(result!.context.destination).toEqual({
      kind: "popular",
      code: "NYC",
      name: "New York City",
      country: "United States",
    });
    expect(hasStaysSearchInUrl(sp)).toBe(true);
  });

  it("parses place destination search", () => {
    const sp = new URLSearchParams({
      check_in: "2026-07-01",
      check_out: "2026-07-05",
      rooms: "2",
      adults: "2",
      children: "1",
      dest_kind: "place",
      place_id: "plc_123",
      dest_name: "London Heathrow",
      dest_iata: "LHR",
      dest_city: "London",
      lat: "51.47",
      lng: "-0.454",
      radius: "15",
    });
    const result = staysSearchFromUrl(sp);
    expect(result).not.toBeNull();
    expect(result!.apiBody.guests).toHaveLength(3);
    expect(result!.context.destination).toMatchObject({
      kind: "place",
      id: "plc_123",
      iata_code: "LHR",
    });
  });

  it("rejects invalid dates and missing destination", () => {
    expect(
      staysSearchFromUrl(
        new URLSearchParams({
          check_in: "2026-06-12",
          check_out: "2026-06-10",
          dest_kind: "popular",
          dest_code: "NYC",
          dest_name: "NYC",
          dest_country: "US",
        }),
      ),
    ).toBeNull();

    expect(
      staysSearchFromUrl(
        new URLSearchParams({
          check_in: "2026-06-10",
          check_out: "2026-06-12",
          dest_kind: "popular",
          dest_code: "XXX",
          dest_name: "Unknown",
          dest_country: "Nowhere",
        }),
      ),
    ).toBeNull();
  });
});

describe("buildStaysSearchQueryParams", () => {
  it("round-trips popular destination keys", () => {
    const p = buildStaysSearchQueryParams({
      check_in_date: "2026-06-10",
      check_out_date: "2026-06-12",
      rooms: 1,
      adults: 2,
      children: 0,
      destination: {
        kind: "popular",
        code: "LON",
        name: "London",
        country: "United Kingdom",
      },
      source_domain: "uk.example.com",
    });
    expect(staysSearchFromUrl(p)).not.toBeNull();
    expect(p.get("source_domain")).toBe("uk.example.com");
    expect(p.get("stays_results")).toBe("1");
  });
});
