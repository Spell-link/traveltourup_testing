import { describe, expect, it } from "vitest";
import { computeCheckoutBreakdown, amountsWithinTolerance } from "@/lib/payments/checkout-pricing";
import { getStaysPaymentsConfig } from "@/config/stays-payments.config";

describe("computeCheckoutBreakdown", () => {
  it("computes markup and charge with USD same currency", () => {
    const cfg = getStaysPaymentsConfig();
    const b = computeCheckoutBreakdown({
      supplierAmount: "100.00",
      supplierCurrency: "USD",
      customerCurrencyRequested: "USD",
      chargeCurrency: "USD",
      chargeCurrencyFallback: false,
      fxRates: { USD: 1, EUR: 0.9, PKR: 280, SAR: 3.75 },
      cfg: { ...cfg, commissionPercent: 5, stripeFeeRate: 0.029 },
    });
    expect(b.supplier_amount).toBe("100.00");
    expect(Number.parseFloat(b.markup_amount)).toBe(5);
    expect(Number.parseFloat(b.customer_total)).toBeGreaterThan(105);
    expect(b.charge_currency).toBe("USD");
  });
});

describe("amountsWithinTolerance", () => {
  it("allows small drift", () => {
    expect(amountsWithinTolerance("100.00", "100.50", 1)).toBe(true);
    expect(amountsWithinTolerance("100.00", "102.00", 1)).toBe(false);
  });
});
