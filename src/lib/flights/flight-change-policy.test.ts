import { describe, expect, it } from "vitest";
import { canChangeFlightBooking, evaluateFlightChangePolicy } from "@/lib/flights/flight-change-policy";

describe("evaluateFlightChangePolicy", () => {
  it("blocks when available_actions omits change", () => {
    const r = evaluateFlightChangePolicy({
      available_actions: ["cancel"],
      conditions: { change_before_departure: { allowed: true } },
    });
    expect(r.allowed).toBe(false);
  });

  it("blocks when change_before_departure is false", () => {
    const r = evaluateFlightChangePolicy({
      available_actions: ["change", "cancel"],
      conditions: { change_before_departure: { allowed: false } },
    });
    expect(r.allowed).toBe(false);
  });

  it("allows when change action and change allowed", () => {
    const r = evaluateFlightChangePolicy({
      available_actions: ["change"],
      conditions: { change_before_departure: { allowed: true } },
    });
    expect(r.allowed).toBe(true);
  });

  it("allows when change action present without explicit condition", () => {
    const r = evaluateFlightChangePolicy({
      available_actions: ["change", "update"],
    });
    expect(r.allowed).toBe(true);
  });
});

describe("canChangeFlightBooking", () => {
  it("requires confirmed status and slices", () => {
    expect(
      canChangeFlightBooking({
        status: "pending",
        duffelOrderId: "ord_1",
        orderRaw: { available_actions: ["change"] },
        changeableSlices: true,
      }),
    ).toBe(false);
  });
});
