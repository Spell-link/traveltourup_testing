import { describe, expect, it } from "vitest";
import {
  buildTripUnitKey,
  groupInterestsByTripUnit,
  pickPrimaryInterest,
} from "@/lib/journey/journey-trip-unit";

describe("buildTripUnitKey", () => {
  it("groups hotel by property and dates", () => {
    const key = buildTripUnitKey({
      product_type: "hotel",
      product_ref: "sr_abc",
      title: "Kempinski Central Avenue Dubai",
      start_date: "2026-06-06",
      end_date: "2026-06-07",
    });
    expect(key).toBe("hotel:kempinski central avenue dubai:2026-06-06:2026-06-07");
  });

  it("falls back to product ref when trip identity is incomplete", () => {
    expect(
      buildTripUnitKey({
        product_type: "hotel",
        product_ref: "sr_abc",
      }),
    ).toBe("ref:sr_abc");
  });

  it("groups flights by route and dates", () => {
    const key = buildTripUnitKey({
      product_type: "flight",
      product_ref: "off_1",
      origin_label: "DXB",
      destination_label: "LHR",
      start_date: "2026-07-01",
      end_date: "2026-07-08",
      trip_type: "round_trip",
    });
    expect(key).toBe("flight:dxb:lhr:2026-07-01:2026-07-08:round_trip");
  });
});

describe("pickPrimaryInterest", () => {
  it("prefers higher funnel stage", () => {
    const primary = pickPrimaryInterest([
      {
        id: "a",
        funnel_stage: "viewed",
        last_seen_at: new Date("2026-06-05T01:15:00Z"),
        first_seen_at: new Date("2026-06-05T01:15:00Z"),
        product_ref: "sr_1",
        converted_booking_id: null,
      },
      {
        id: "b",
        funnel_stage: "booking_confirmed",
        last_seen_at: new Date("2026-06-05T01:19:00Z"),
        first_seen_at: new Date("2026-06-05T01:19:00Z"),
        product_ref: "qt_1",
        converted_booking_id: "bk_1",
      },
    ]);
    expect(primary.id).toBe("b");
  });
});

describe("groupInterestsByTripUnit", () => {
  it("merges rows with the same trip unit key", () => {
    const grouped = groupInterestsByTripUnit([
      {
        id: "a",
        user_id: "u1",
        product_type: "hotel",
        trip_unit_key: "hotel:kempinski:2026-06-06:2026-06-07",
        funnel_stage: "viewed",
        last_seen_at: new Date("2026-06-05T01:15:00Z"),
        first_seen_at: new Date("2026-06-05T01:15:00Z"),
        product_ref: "sr_1",
        converted_booking_id: null,
      },
      {
        id: "b",
        user_id: "u1",
        product_type: "hotel",
        trip_unit_key: "hotel:kempinski:2026-06-06:2026-06-07",
        funnel_stage: "booking_confirmed",
        last_seen_at: new Date("2026-06-05T01:19:00Z"),
        first_seen_at: new Date("2026-06-05T01:19:00Z"),
        product_ref: "qt_1",
        converted_booking_id: "bk_1",
      },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.funnel_stage).toBe("booking_confirmed");
    expect(grouped[0]?.converted_booking_id).toBe("bk_1");
    expect(grouped[0]?.first_seen_at.toISOString()).toBe("2026-06-05T01:15:00.000Z");
  });
});
