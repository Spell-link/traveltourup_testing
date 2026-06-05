import { describe, expect, it, vi } from "vitest";
import {
  captureStripePaymentIntent,
  ensureStripePaymentRequiresCapture,
  voidStripePaymentIntent,
  type RemoteStripePaymentIntent,
  type StripeCaptureDeps,
} from "@/lib/payments/stripe-capture.core";

function makePi(overrides: Partial<RemoteStripePaymentIntent> = {}): RemoteStripePaymentIntent {
  return {
    id: "pi_test",
    status: "requires_capture",
    amount: 10000,
    currency: "usd",
    ...overrides,
  };
}

function makeDeps(pi: RemoteStripePaymentIntent): StripeCaptureDeps {
  return {
    retrieve: vi.fn().mockResolvedValue(pi),
    capture: vi.fn().mockResolvedValue({ ...pi, status: "succeeded" }),
    cancel: vi.fn().mockResolvedValue({ ...pi, status: "canceled" }),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ensureStripePaymentRequiresCapture", () => {
  it("returns PI when status is requires_capture", async () => {
    const pi = makePi();
    const deps = makeDeps(pi);
    await expect(ensureStripePaymentRequiresCapture(deps, pi.id)).resolves.toEqual(pi);
  });

  it("throws when not authorized", async () => {
    const pi = makePi({ status: "requires_payment_method" });
    const deps = makeDeps(pi);
    await expect(ensureStripePaymentRequiresCapture(deps, pi.id)).rejects.toThrow(
      "not authorized",
    );
  });
});

describe("captureStripePaymentIntent", () => {
  it("captures when requires_capture", async () => {
    const pi = makePi();
    const deps = makeDeps(pi);
    const result = await captureStripePaymentIntent(deps, pi.id);
    expect(result.called_capture).toBe(true);
    expect(result.status).toBe("succeeded");
    expect(deps.capture).toHaveBeenCalledWith(pi.id);
  });

  it("skips capture when already succeeded", async () => {
    const pi = makePi({ status: "succeeded" });
    const deps = makeDeps(pi);
    const result = await captureStripePaymentIntent(deps, pi.id);
    expect(result.called_capture).toBe(false);
    expect(deps.capture).not.toHaveBeenCalled();
  });
});

describe("voidStripePaymentIntent", () => {
  it("cancels authorized PI", async () => {
    const pi = makePi();
    const deps = makeDeps(pi);
    const result = await voidStripePaymentIntent(deps, pi.id);
    expect(result.status).toBe("canceled");
    expect(deps.cancel).toHaveBeenCalledWith(pi.id);
  });

  it("throws when already captured", async () => {
    const pi = makePi({ status: "succeeded" });
    const deps = makeDeps(pi);
    await expect(voidStripePaymentIntent(deps, pi.id)).rejects.toThrow("already captured");
  });
});
