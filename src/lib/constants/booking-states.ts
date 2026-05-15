/**
 * Canonical state values for booking, payment, intent, cancellation, refund,
 * and the booking financial-event ledger.
 *
 * The DB enforces these via CHECK constraints (see migration
 * `20260515120000_booking_state_constraints_and_ledger`). This module is the
 * single TypeScript source of truth — never write a raw status string in code.
 */

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "failed",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_PAYMENT_STATUSES = [
  "unpaid",
  "paid",
  "refund_processing",
  "refund_pending",
  "refunded",
  "partially_refunded",
  "refund_failed",
  "credit_issued",
] as const;
export type BookingPaymentStatus = (typeof BOOKING_PAYMENT_STATUSES)[number];

/**
 * Mirrors Duffel `payment_intent.status` so we never drift from upstream
 * vocabulary. Lower-case throughout.
 */
export const FLIGHT_PAYMENT_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "processing",
  "succeeded",
  "canceled",
  "failed",
  "unknown",
] as const;
export type FlightPaymentIntentStatus =
  (typeof FLIGHT_PAYMENT_INTENT_STATUSES)[number];

export const FLIGHT_ORDER_CANCELLATION_STATUSES = [
  "pending",
  "confirmed",
  "expired",
  "superseded",
] as const;
export type FlightOrderCancellationStatus =
  (typeof FLIGHT_ORDER_CANCELLATION_STATUSES)[number];

export const FLIGHT_PAYMENT_REFUND_ATTEMPT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "skipped",
] as const;
export type FlightPaymentRefundAttemptStatus =
  (typeof FLIGHT_PAYMENT_REFUND_ATTEMPT_STATUSES)[number];

/** Append-only money-moving event types on the booking ledger. */
export const BOOKING_FINANCIAL_EVENT_TYPES = [
  "intent_created",
  "intent_succeeded",
  "intent_failed",
  "order_placed",
  "order_failed",
  "refund_initiated",
  "refund_succeeded",
  "refund_failed",
  "cancel_quoted",
  "cancel_confirmed",
  "change_quoted",
  "change_confirmed",
] as const;
export type BookingFinancialEventType =
  (typeof BOOKING_FINANCIAL_EVENT_TYPES)[number];

/** Type guards — useful at the boundary when reading values from Duffel/DB. */
export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}

export function isBookingPaymentStatus(v: unknown): v is BookingPaymentStatus {
  return (
    typeof v === "string" &&
    (BOOKING_PAYMENT_STATUSES as readonly string[]).includes(v)
  );
}

export function isFlightPaymentIntentStatus(
  v: unknown,
): v is FlightPaymentIntentStatus {
  return (
    typeof v === "string" &&
    (FLIGHT_PAYMENT_INTENT_STATUSES as readonly string[]).includes(v)
  );
}
