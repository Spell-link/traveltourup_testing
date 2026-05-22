import { describe, expect, it } from "vitest";
import { computeFlightRevenueFromPit, resolveDuffelPaymentFee } from "./flight-revenue-breakdown";

/** Numbers from Duffel dashboard screenshot (May 21, 2026). */
const SCREENSHOT_PIT = {
  charge_amount: "375.42",
  charge_currency: "USD",
  offer_amount: "347.17",
  services_subtotal_amount: "0.00",
  markup_amount: "17.36",
  subtotal_charged_amount: "364.53",
  duffel_payments_fee_amount: "10.89",
  duffel_payments_fee_rate: "0.029",
};

describe("flight-revenue-breakdown", () => {
  it("matches Duffel dashboard screenshot economics", () => {
    const b = computeFlightRevenueFromPit(SCREENSHOT_PIT);
    expect(b.customer_paid).toBe("375.42");
    expect(b.duffel_cost).toBe("347.17");
    expect(b.commission).toBe("17.36");
    expect(b.duffel_payment_fee).toBe("10.89");
    expect(b.estimated).toBe(false);
    const sum =
      parseFloat(b.duffel_cost) + parseFloat(b.commission) + parseFloat(b.duffel_payment_fee);
    expect(sum).toBeCloseTo(parseFloat(b.customer_paid), 2);
  });

  it("uses persisted fee when available", () => {
    const { fee, estimated } = resolveDuffelPaymentFee(SCREENSHOT_PIT);
    expect(fee).toBe("10.89");
    expect(estimated).toBe(false);
  });

  it("flags estimated fee for legacy rows without snapshot", () => {
    const { estimated } = resolveDuffelPaymentFee({
      charge_amount: "100.00",
      charge_currency: "USD",
      offer_amount: "80.00",
      markup_amount: "5.00",
      services_subtotal_amount: "0",
    });
    expect(estimated).toBe(true);
  });
});
