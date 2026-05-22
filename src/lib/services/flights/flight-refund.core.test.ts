import { describe, expect, it } from "vitest";

import {
  cardRefundPaymentLabel,
  computeRefundAmountForPit,
  compensationTerminalCodeFromRefundStatus,
  isCardRefundPath,
  isDuffelRefundPending,
  isDuffelRefundSucceeded,
} from "@/lib/services/flights/flight-refund.core";

describe("cardRefundPaymentLabel", () => {
  it("returns refunded when quote covers booking total", () => {
    expect(cardRefundPaymentLabel("250.00", "250.00")).toBe("refunded");
    expect(cardRefundPaymentLabel(250, "249.996")).toBe("refunded");
  });

  it("returns partially_refunded when quote is lower", () => {
    expect(cardRefundPaymentLabel("250.00", "100.00")).toBe("partially_refunded");
  });

  it("returns partially_refunded when quote missing", () => {
    expect(cardRefundPaymentLabel("250.00", null)).toBe("partially_refunded");
  });
});

describe("computeRefundAmountForPit", () => {
  it("caps refund at charge amount", () => {
    const r = computeRefundAmountForPit({
      refundAmount: "300",
      refundCurrency: "USD",
      chargeAmount: "250.00",
      chargeCurrency: "USD",
    });
    expect(r).toEqual({ ok: true, amount: "250.00", currency: "USD" });
  });

  it("rejects currency mismatch", () => {
    const r = computeRefundAmountForPit({
      refundAmount: "100",
      refundCurrency: "EUR",
      chargeAmount: "100",
      chargeCurrency: "USD",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("CURRENCY_MISMATCH");
  });

  it("rejects zero refund", () => {
    const r = computeRefundAmountForPit({
      refundAmount: "0",
      refundCurrency: "USD",
      chargeAmount: "100",
      chargeCurrency: "USD",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ZERO_REFUND");
  });
});

describe("isCardRefundPath", () => {
  it("treats null and original_form_of_payment as card path", () => {
    expect(isCardRefundPath(null)).toBe(true);
    expect(isCardRefundPath("original_form_of_payment")).toBe(true);
    expect(isCardRefundPath("airline_credits")).toBe(false);
  });
});

describe("Duffel refund status helpers", () => {
  it("maps compensation terminal codes", () => {
    expect(compensationTerminalCodeFromRefundStatus("succeeded")).toBe("BOOKING_FAILED_REFUNDED");
    expect(compensationTerminalCodeFromRefundStatus("pending")).toBe("BOOKING_FAILED_REFUND_PENDING");
    expect(compensationTerminalCodeFromRefundStatus("failed")).toBe("BOOKING_FAILED_AFTER_PAYMENT");
  });

  it("detects pending and succeeded", () => {
    expect(isDuffelRefundPending("processing")).toBe(true);
    expect(isDuffelRefundSucceeded("completed")).toBe(true);
  });
});
