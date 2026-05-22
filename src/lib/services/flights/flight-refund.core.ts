/**
 * Pure refund helpers (no DB / Duffel) — safe for unit tests.
 */

export function cardRefundPaymentLabel(
  bookingTotal: string | number | { toString(): string },
  refundAmount: string | null,
): "refunded" | "partially_refunded" {
  if (refundAmount == null || refundAmount === "") return "partially_refunded";
  const r = Number.parseFloat(refundAmount);
  const t = Number.parseFloat(String(bookingTotal));
  if (!Number.isFinite(r) || !Number.isFinite(t)) return "partially_refunded";
  if (r + 0.005 >= t) return "refunded";
  return "partially_refunded";
}

export function computeRefundAmountForPit(input: {
  refundAmount: string | null;
  refundCurrency: string | null;
  chargeAmount: string;
  chargeCurrency: string;
}): { ok: true; amount: string; currency: string } | { ok: false; reason: string } {
  if (!input.refundCurrency || !input.chargeCurrency) {
    return { ok: false, reason: "MISSING_CURRENCY" };
  }
  if (input.refundCurrency.toUpperCase() !== input.chargeCurrency.toUpperCase()) {
    return { ok: false, reason: "CURRENCY_MISMATCH" };
  }
  const cur = input.chargeCurrency.toUpperCase();
  const r = Number.parseFloat(input.refundAmount ?? "");
  const c = Number.parseFloat(input.chargeAmount);
  if (!Number.isFinite(r) || !Number.isFinite(c) || c <= 0) {
    return { ok: false, reason: "INVALID_AMOUNTS" };
  }
  const amt = Math.min(Math.max(0, r), c);
  if (amt <= 0) return { ok: false, reason: "ZERO_REFUND" };
  return { ok: true, amount: amt.toFixed(2), currency: cur };
}

/** Card refund path when Duffel cancellation quotes refund to the traveller's card. */
export function isCardRefundPath(refundTo: string | null | undefined): boolean {
  if (!refundTo) return true;
  return refundTo === "original_form_of_payment";
}

export function isNonCardRefundTo(refundTo: string | null | undefined): boolean {
  return refundTo === "airline_credits" || refundTo === "balance";
}

export function normalizeDuffelRefundStatus(status: string | null | undefined): string {
  return (status ?? "").toLowerCase();
}

export function isDuffelRefundSucceeded(status: string | null | undefined): boolean {
  const st = normalizeDuffelRefundStatus(status);
  return st === "succeeded" || st === "completed";
}

export function isDuffelRefundFailed(status: string | null | undefined): boolean {
  const st = normalizeDuffelRefundStatus(status);
  return st === "failed" || st === "canceled";
}

export function isDuffelRefundPending(status: string | null | undefined): boolean {
  const st = normalizeDuffelRefundStatus(status);
  return st === "pending" || st === "processing";
}

export function compensationTerminalCodeFromRefundStatus(
  refundStatus: string | null,
): "BOOKING_FAILED_REFUNDED" | "BOOKING_FAILED_REFUND_PENDING" | "BOOKING_FAILED_AFTER_PAYMENT" {
  if (isDuffelRefundSucceeded(refundStatus)) return "BOOKING_FAILED_REFUNDED";
  if (isDuffelRefundPending(refundStatus)) return "BOOKING_FAILED_REFUND_PENDING";
  return "BOOKING_FAILED_AFTER_PAYMENT";
}
