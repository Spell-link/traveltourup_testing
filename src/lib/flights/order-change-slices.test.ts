import { describe, expect, it } from "vitest";

import {
  buildOrderChangeSlicesBody,
  parseOrderChangeSlicesFromOrderRaw,
} from "@/lib/flights/order-change-slices";

const sampleOrder = {
  data: {
    id: "ord_1",
    slices: [
      {
        id: "sli_out",
        origin: { iata_code: "JFK" },
        destination: { iata_code: "LHR" },
        segments: [
          {
            departing_at: "2026-06-12T10:00:00Z",
            arriving_at: "2026-06-12T22:00:00Z",
            cabin_class: "economy",
            marketing_carrier: { name: "British Airways", iata_code: "BA" },
          },
        ],
      },
    ],
  },
};

describe("parseOrderChangeSlicesFromOrderRaw", () => {
  it("extracts slice ids and route metadata", () => {
    const rows = parseOrderChangeSlicesFromOrderRaw(sampleOrder);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slice_id).toBe("sli_out");
    expect(rows[0]?.origin_iata).toBe("JFK");
    expect(rows[0]?.destination_iata).toBe("LHR");
    expect(rows[0]?.departure_date).toBe("2026-06-12");
  });
});

describe("buildOrderChangeSlicesBody", () => {
  it("builds remove + add for date change", () => {
    const slices = parseOrderChangeSlicesFromOrderRaw(sampleOrder);
    const body = buildOrderChangeSlicesBody({
      selected_slice_id: "sli_out",
      departure_date: "2026-06-20",
      slices,
    });
    expect(body.remove).toEqual([{ slice_id: "sli_out" }]);
    expect(body.add[0]).toMatchObject({
      origin: "JFK",
      destination: "LHR",
      departure_date: "2026-06-20",
      cabin_class: "economy",
    });
  });
});
