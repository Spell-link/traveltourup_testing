import { describe, expect, it, vi } from "vitest";

import {
  captureDuffelPaymentForInstantBooking,
  FlightCaptureError,
  type CaptureDeps,
  type RemotePaymentIntent,
} from "@/lib/services/flights/flight-payment-capture.core";

function makeDeps(overrides: Partial<CaptureDeps> = {}): CaptureDeps {
  return {
    confirm: vi.fn(async (id) => ({
      id,
      status: "succeeded",
      confirmed_at: new Date().toISOString(),
    })),
    get: vi.fn(async (id) => ({
      id,
      status: "succeeded",
      confirmed_at: new Date().toISOString(),
    })),
    persistStatus: vi.fn(async () => {}),
    sleep: vi.fn(async () => {}),
    isAlreadyConfirmedError: () => false,
    asDuffelError: () => null,
    ...overrides,
  };
}

describe("captureDuffelPaymentForInstantBooking", () => {
  it("calls confirm and accepts immediate succeeded + confirmed_at", async () => {
    const deps = makeDeps();
    const result = await captureDuffelPaymentForInstantBooking(
      { duffel_intent_id: "pit_1", status: "requires_confirmation" },
      deps,
    );
    expect(deps.confirm).toHaveBeenCalledTimes(1);
    expect(deps.get).not.toHaveBeenCalled();
    expect(deps.persistStatus).toHaveBeenCalledWith("pit_1", "succeeded");
    expect(result.called_confirm).toBe(true);
    expect(result.poll_attempts).toBe(0);
    expect(result.confirmed_at).toBeTruthy();
  });

  it("polls when confirm returns processing and succeeds later", async () => {
    let n = 0;
    const deps = makeDeps({
      confirm: vi.fn(async (id) => ({
        id,
        status: "processing",
        confirmed_at: null,
      })),
      get: vi.fn(async (id): Promise<RemotePaymentIntent> => {
        n++;
        if (n < 3) return { id, status: "processing", confirmed_at: null };
        return { id, status: "succeeded", confirmed_at: "2026-05-15T20:00:00Z" };
      }),
    });
    const result = await captureDuffelPaymentForInstantBooking(
      { duffel_intent_id: "pit_2", status: "requires_confirmation" },
      deps,
    );
    expect(deps.confirm).toHaveBeenCalledTimes(1);
    expect(result.poll_attempts).toBe(3);
    expect(result.confirmed_at).toBe("2026-05-15T20:00:00Z");
  });

  it("treats 'already confirmed' DuffelApiError as idempotent and continues via GET", async () => {
    const deps = makeDeps({
      confirm: vi.fn(async () => {
        throw new Error("already confirmed");
      }),
      get: vi.fn(async (id) => ({
        id,
        status: "succeeded",
        confirmed_at: "2026-05-15T20:00:00Z",
      })),
      isAlreadyConfirmedError: () => true,
    });
    const result = await captureDuffelPaymentForInstantBooking(
      { duffel_intent_id: "pit_3", status: "requires_confirmation" },
      deps,
    );
    expect(deps.get).toHaveBeenCalled();
    expect(result.confirmed_at).toBe("2026-05-15T20:00:00Z");
  });

  it("short-circuits cleanly when DB+remote already show succeeded with confirmed_at (retry replay)", async () => {
    const deps = makeDeps({
      get: vi.fn(async (id) => ({
        id,
        status: "succeeded",
        confirmed_at: "2026-05-15T20:00:00Z",
      })),
    });
    const result = await captureDuffelPaymentForInstantBooking(
      { duffel_intent_id: "pit_4", status: "succeeded" },
      deps,
    );
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.get).toHaveBeenCalledTimes(1);
    expect(result.called_confirm).toBe(false);
    expect(result.confirmed_at).toBe("2026-05-15T20:00:00Z");
  });

  it("does NOT short-circuit if local DB says succeeded but remote lacks confirmed_at (drift)", async () => {
    let phase = 0;
    const deps = makeDeps({
      get: vi.fn(async (id): Promise<RemotePaymentIntent> => {
        phase++;
        if (phase === 1)
          return { id, status: "succeeded", confirmed_at: null };
        return { id, status: "succeeded", confirmed_at: "2026-05-15T20:00:00Z" };
      }),
      confirm: vi.fn(async (id) => ({
        id,
        status: "succeeded",
        confirmed_at: "2026-05-15T20:00:00Z",
      })),
    });
    const result = await captureDuffelPaymentForInstantBooking(
      { duffel_intent_id: "pit_5", status: "succeeded" },
      deps,
    );
    expect(deps.confirm).toHaveBeenCalledTimes(1);
    expect(result.called_confirm).toBe(true);
  });

  it("throws PAYMENT_FAILED on terminal failed status", async () => {
    const deps = makeDeps({
      confirm: vi.fn(async (id) => ({ id, status: "failed", confirmed_at: null })),
    });
    await expect(
      captureDuffelPaymentForInstantBooking(
        { duffel_intent_id: "pit_6", status: "requires_confirmation" },
        deps,
      ),
    ).rejects.toMatchObject({ info: { code: "PAYMENT_FAILED" } });
  });

  it("throws PAYMENT_INCOMPLETE when poll budget exhausted without terminal status", async () => {
    const deps = makeDeps({
      confirm: vi.fn(async (id) => ({ id, status: "processing", confirmed_at: null })),
      get: vi.fn(async (id) => ({ id, status: "processing", confirmed_at: null })),
    });
    await expect(
      captureDuffelPaymentForInstantBooking(
        { duffel_intent_id: "pit_7", status: "requires_confirmation" },
        deps,
      ),
    ).rejects.toMatchObject({ info: { code: "PAYMENT_INCOMPLETE" } });
  });

  it("throws PAYMENT_NOT_CAPTURED if succeeded but confirmed_at is missing", async () => {
    const deps = makeDeps({
      confirm: vi.fn(async (id) => ({ id, status: "succeeded", confirmed_at: null })),
    });
    await expect(
      captureDuffelPaymentForInstantBooking(
        { duffel_intent_id: "pit_8", status: "requires_confirmation" },
        deps,
      ),
    ).rejects.toMatchObject({ info: { code: "PAYMENT_NOT_CAPTURED" } });
  });

  it("wraps non-idempotent DuffelApiError as PAYMENT_CONFIRM_FAILED", async () => {
    const fakeDuffel = {
      clientMessage: "Card was declined.",
    } as unknown as import("@/lib/duffel/errors").DuffelApiError;
    const deps = makeDeps({
      confirm: vi.fn(async () => {
        throw new Error("decline");
      }),
      asDuffelError: (e) => (e instanceof Error ? fakeDuffel : null),
    });
    await expect(
      captureDuffelPaymentForInstantBooking(
        { duffel_intent_id: "pit_9", status: "requires_confirmation" },
        deps,
      ),
    ).rejects.toBeInstanceOf(FlightCaptureError);
    await expect(
      captureDuffelPaymentForInstantBooking(
        { duffel_intent_id: "pit_9", status: "requires_confirmation" },
        deps,
      ),
    ).rejects.toMatchObject({
      info: { code: "PAYMENT_CONFIRM_FAILED", message: "Card was declined." },
    });
  });
});
