/**
 * Stripe PaymentIntent capture / void helpers (testable ports).
 */

export type RemoteStripePaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
};

export type StripeCaptureDeps = {
  retrieve: (id: string) => Promise<RemoteStripePaymentIntent>;
  capture: (id: string) => Promise<RemoteStripePaymentIntent>;
  cancel: (id: string) => Promise<RemoteStripePaymentIntent>;
  sleep: (ms: number) => Promise<void>;
};

export type StripeCaptureResult = {
  status: string;
  called_capture: boolean;
};

const REQUIRES_CAPTURE = "requires_capture";
const CAPTURED = "succeeded";
const CANCELED = "canceled";

export async function ensureStripePaymentRequiresCapture(
  deps: StripeCaptureDeps,
  paymentIntentId: string,
): Promise<RemoteStripePaymentIntent> {
  const pi = await deps.retrieve(paymentIntentId);
  if (pi.status !== REQUIRES_CAPTURE) {
    throw new Error(`PaymentIntent is not authorized (${pi.status}).`);
  }
  return pi;
}

export async function captureStripePaymentIntent(
  deps: StripeCaptureDeps,
  paymentIntentId: string,
): Promise<StripeCaptureResult> {
  const current = await deps.retrieve(paymentIntentId);
  if (current.status === CAPTURED) {
    return { status: CAPTURED, called_capture: false };
  }
  if (current.status !== REQUIRES_CAPTURE) {
    throw new Error(`Cannot capture PaymentIntent in status ${current.status}.`);
  }
  const captured = await deps.capture(paymentIntentId);
  return { status: captured.status, called_capture: true };
}

export async function voidStripePaymentIntent(
  deps: StripeCaptureDeps,
  paymentIntentId: string,
): Promise<StripeCaptureResult> {
  const current = await deps.retrieve(paymentIntentId);
  if (current.status === CANCELED) {
    return { status: CANCELED, called_capture: false };
  }
  if (current.status === CAPTURED) {
    throw new Error("Cannot void an already captured PaymentIntent.");
  }
  const canceled = await deps.cancel(paymentIntentId);
  return { status: canceled.status, called_capture: false };
}
