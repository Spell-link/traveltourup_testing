import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapDuffelOfferToDto } from "./flight-offer.dto";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("mapDuffelOfferToDto", () => {
  it("maps fixture offer to stable DTO", () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, "__fixtures__", "offer-minimal.json"), "utf8"),
    ) as unknown;

    const dto = mapDuffelOfferToDto(raw);

    expect(dto.id).toBe("off_test_fixture_001");
    expect(dto.total_amount).toBe("350.50");
    expect(dto.total_currency).toBe("USD");
    expect(dto.expires_at).toBe("2026-05-01T12:00:00.000Z");
    expect(dto.live_mode).toBe(false);
    expect(dto.slices).toHaveLength(1);
    expect(dto.slices[0].origin_iata).toBe("LHR");
    expect(dto.slices[0].destination_iata).toBe("JFK");
    expect(dto.slices[0].stops_count).toBe(0);
    expect(dto.slices[0].segments).toHaveLength(1);
    expect(dto.slices[0].segments[0].flight_number).toBe("0178");
    expect(dto.slices[0].segments[0].cabin_class).toBe("economy");
    expect(dto.passengers).toEqual([{ id: "pas_test_adult_1", type: "adult" }]);
    expect(dto.available_services).toEqual([]);
    expect(dto.passenger_identity_documents_required).toBe(false);
    expect(dto.supported_passenger_identity_document_types).toEqual([]);
  });

  it("accepts bare offer object without data wrapper", () => {
    const dto = mapDuffelOfferToDto({
      id: "off_bare",
      total_amount: "1.00",
      total_currency: "EUR",
      slices: [],
    });
    expect(dto.id).toBe("off_bare");
    expect(dto.slices).toEqual([]);
    expect(dto.passengers).toEqual([]);
    expect(dto.available_services).toEqual([]);
    expect(dto.passenger_identity_documents_required).toBe(false);
    expect(dto.supported_passenger_identity_document_types).toEqual([]);
  });

  it("throws on invalid payload", () => {
    expect(() => mapDuffelOfferToDto(null)).toThrow(/Invalid Duffel offer payload/);
    expect(() => mapDuffelOfferToDto({ data: { id: "x" } })).toThrow(
      /missing id, total_amount, or total_currency/,
    );
  });
});
