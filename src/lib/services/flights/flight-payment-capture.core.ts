/**
 * Server-side capture of a Duffel `pit_*` PaymentIntent for an instant pay-now
 * booking. This is the step that:
 *
 *   1) Sweeps funds from the customer's card (held by Duffel's Stripe rail)
 *      into our Duffel balance.
 *   2) Creates the **Payment** row + **Fees** row in the Duffel dashboard,
 *      which is the customer-facing source of truth that "the card was charged".
 *   3) Populates `confirmed_at`, `card_last_four_digits`, `net_amount`,
 *      `fees_amount` on the PaymentIntent.
 *
 * Per Duffel docs (Collecting customer card payments → "Confirm PaymentIntent"),
 * confirm MUST be called server-side after the front-end card collection. We
 * never short-circuit on remote `status` alone — that would let an inconsistent
 * read create an order out of the merchant balance without ever capturing the
 * customer's card. Calling confirm on an already-confirmed PIT is treated as
 * idempotent.
 *
 * This module is intentionally free of `server-only` so it is unit-testable
 * with mocked Duffel + repository ports. The DB-bound wiring lives in
 * `flights-booking.service.ts`.
 */

import type { DuffelApiError } from "@/lib/duffel/errors";

export type CaptureablePaymentIntent = {
  duffel_intent_id: string;
  status: string;
};

export type RemotePaymentIntent = {
  id: string;
  status: string;
  confirmed_at?: string | null;
};

export type CaptureDeps = {
  confirm: (id: string) => Promise<RemotePaymentIntent>;
  get: (id: string) => Promise<RemotePaymentIntent>;
  persistStatus: (id: string, status: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  /** Test-friendly hook to detect 'already confirmed' style errors. */
  isAlreadyConfirmedError: (e: unknown) => boolean;
  /** Test-friendly hook to detect generic Duffel errors so we wrap their message. */
  asDuffelError: (e: unknown) => DuffelApiError | null;
};

export type CaptureResult = {
  /** Final remote PIT status, e.g. "succeeded". */
  status: string;
  /** Truthy when Duffel has finalised the capture and shown a Payment row in dashboard. */
  confirmed_at: string | null;
  /** Whether we issued the confirm call (false when PIT was already confirmed on entry). */
  called_confirm: boolean;
  /** How many poll attempts were needed (excluding the initial confirm response). */
  poll_attempts: number;
};

export type CaptureError =
  | { code: "PAYMENT_CONFIRM_FAILED"; message: string }
  | { code: "PAYMENT_FAILED"; message: string }
  | { code: "PAYMENT_INCOMPLETE"; message: string }
  | { code: "PAYMENT_NOT_CAPTURED"; message: string };

export class FlightCaptureError extends Error {
  readonly name = "FlightCaptureError";
  constructor(public readonly info: CaptureError) {
    super(info.message);
  }
}

const TERMINAL_FAIL = new Set(["failed", "canceled", "cancelled"]);
const TERMINAL_OK = "succeeded";
const POLL_MAX = 10;
const POLL_DELAY_MS = 300;

/**
 * Drives PIT → succeeded with `confirmed_at` set. Always calls `confirm` unless
 * the PIT is *already* in a terminal succeeded state with `confirmed_at`
 * populated (e.g. retry of the same booking after we already captured the card
 * on a previous attempt).
 */
export async function captureDuffelPaymentForInstantBooking(
  pit: CaptureablePaymentIntent,
  deps: CaptureDeps,
): Promise<CaptureResult> {
  let remote: RemotePaymentIntent | null = null;
  let calledConfirm = false;

  // Optimistic: if the DB already says succeeded *and* Duffel agrees + has
  // confirmed_at set, this is a safe replay (e.g. caller retried after a
  // post-capture failure). We still verify with a fresh GET to avoid trusting
  // stale local state.
  if (pit.status.toLowerCase() === TERMINAL_OK) {
    remote = await deps.get(pit.duffel_intent_id);
    if (
      (remote.status ?? "").toLowerCase() === TERMINAL_OK &&
      typeof remote.confirmed_at === "string" &&
      remote.confirmed_at.length > 0
    ) {
      await deps.persistStatus(pit.duffel_intent_id, remote.status);
      return {
        status: remote.status,
        confirmed_at: remote.confirmed_at,
        called_confirm: false,
        poll_attempts: 0,
      };
    }
  }

  try {
    remote = await deps.confirm(pit.duffel_intent_id);
    calledConfirm = true;
  } catch (e) {
    if (deps.isAlreadyConfirmedError(e)) {
      remote = await deps.get(pit.duffel_intent_id);
    } else {
      const duffelErr = deps.asDuffelError(e);
      if (duffelErr) {
        throw new FlightCaptureError({
          code: "PAYMENT_CONFIRM_FAILED",
          message: duffelErr.clientMessage,
        });
      }
      throw e;
    }
  }

  let pollAttempts = 0;
  let status = (remote?.status ?? "").toLowerCase();
  while (
    pollAttempts < POLL_MAX &&
    status !== TERMINAL_OK &&
    !TERMINAL_FAIL.has(status)
  ) {
    await deps.sleep(POLL_DELAY_MS);
    remote = await deps.get(pit.duffel_intent_id);
    status = (remote.status ?? "").toLowerCase();
    pollAttempts++;
  }

  await deps.persistStatus(pit.duffel_intent_id, remote?.status || "unknown");

  if (TERMINAL_FAIL.has(status)) {
    throw new FlightCaptureError({
      code: "PAYMENT_FAILED",
      message: "Payment did not succeed.",
    });
  }
  if (status !== TERMINAL_OK) {
    throw new FlightCaptureError({
      code: "PAYMENT_INCOMPLETE",
      message: "Payment is not complete.",
    });
  }

  // `confirmed_at` is the only field that proves Duffel finalised the capture
  // and the Payment row exists in the merchant dashboard. Treat its absence as
  // a hard failure so we never create the airline order without it.
  const confirmedAt =
    typeof remote?.confirmed_at === "string" && remote.confirmed_at.length > 0
      ? remote.confirmed_at
      : null;
  if (!confirmedAt) {
    throw new FlightCaptureError({
      code: "PAYMENT_NOT_CAPTURED",
      message: "Payment confirmation did not finalise. Please retry checkout.",
    });
  }

  return {
    status: remote?.status ?? TERMINAL_OK,
    confirmed_at: confirmedAt,
    called_confirm: calledConfirm,
    poll_attempts: pollAttempts,
  };
}
