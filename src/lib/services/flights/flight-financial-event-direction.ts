import type { BookingFinancialEventType } from "@/lib/constants/booking-states";

/** Customer-facing ledger column + badges. */
export type FinancialEventDirection = "debit" | "credit" | "neutral";

/** Filter values for admin/profile list queries. */
export const FLIGHT_LEDGER_DIRECTION_FILTERS = ["debit", "credit", "neutral"] as const;
export type FlightLedgerDirectionFilter = (typeof FLIGHT_LEDGER_DIRECTION_FILTERS)[number];

function parseAmount(amount: string | null): number | null {
  if (amount == null || amount === "") return null;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : null;
}

/**
 * Single source of truth for debit/credit/neutral classification.
 * Aligns with list filters in `booking-financial-event.repository` (flight ledger).
 */
export function classifyFlightFinancialEventDirection(
  type: BookingFinancialEventType,
  amount: string | null,
): FinancialEventDirection {
  const n = parseAmount(amount);

  switch (type) {
    case "intent_succeeded":
    case "order_placed":
      return "debit";
    case "refund_initiated":
    case "refund_succeeded":
      return "credit";
    case "change_confirmed":
      if (n != null && n < 0) return "credit";
      if (n != null && n > 0) return "debit";
      return "neutral";
    case "cancel_confirmed":
      if (n != null && n > 0) return "credit";
      return "neutral";
    default:
      return "neutral";
  }
}

export function customerEventLabel(type: BookingFinancialEventType): string {
  const labels: Record<BookingFinancialEventType, string> = {
    intent_created: "Payment authorised",
    intent_succeeded: "Payment captured",
    intent_failed: "Payment failed",
    order_placed: "Booking confirmed by airline",
    order_failed: "Airline could not confirm — refund in progress",
    refund_initiated: "Refund initiated",
    refund_succeeded: "Refund completed",
    refund_failed: "Refund failed",
    cancel_quoted: "Cancellation quote",
    cancel_confirmed: "Cancellation confirmed",
    change_quoted: "Flight change quoted",
    change_confirmed: "Flight change confirmed",
  };
  return labels[type] ?? type;
}

const ADMIN_RECONCILIATION_LABELS: Partial<Record<BookingFinancialEventType, string>> = {
  intent_created: "Payment (quoted)",
  intent_succeeded: "Payment captured",
  order_placed: "Order (balance debit)",
  cancel_confirmed: "Order cancelled (balance credit)",
  refund_succeeded: "Card refund",
};

export function adminEventLabel(type: BookingFinancialEventType): string {
  return ADMIN_RECONCILIATION_LABELS[type] ?? customerEventLabel(type);
}

export function reconciliationLabelFromPayload(
  type: BookingFinancialEventType,
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (type === "order_placed" && p.duffel_balance_debit) return "Order";
  if (type === "intent_created" && p.duffel_payment_fee) return "Fees";
  if (type === "intent_succeeded" || (type === "intent_created" && p.customer_paid)) return "Payment";
  if (type === "cancel_confirmed") return "Order cancelled";
  return null;
}
