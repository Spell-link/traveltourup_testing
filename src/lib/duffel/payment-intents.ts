import "server-only";
import { duffelFetch } from "./client";

export type DuffelPaymentIntentResource = {
  id: string;
  live_mode: boolean;
  status: string;
  amount: string;
  currency: string;
  client_token: string;
  created_at?: string;
  updated_at?: string;
  confirmed_at?: string | null;
  /** Present after capture — Duffel Payments processing fee. */
  fees_amount?: string | null;
  fees_currency?: string | null;
  /** Amount credited to balance after fees. */
  net_amount?: string | null;
};

type Wrapped<T> = { data: T };

function unwrapData<T>(body: unknown): T {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid Duffel payment response");
  }
  const data = (body as Wrapped<T>).data;
  if (!data || typeof data !== "object") {
    throw new Error("Duffel payment response missing data");
  }
  return data;
}

/** GET /payments/payment_intents/:id */
export async function getDuffelPaymentIntent(paymentIntentId: string): Promise<DuffelPaymentIntentResource> {
  const res = await duffelFetch<unknown>(
    `/payments/payment_intents/${encodeURIComponent(paymentIntentId)}`,
    { method: "GET" },
  );
  return unwrapData<DuffelPaymentIntentResource>(res);
}

/** POST /payments/payment_intents */
export async function createDuffelPaymentIntent(input: {
  amount: string;
  currency: string;
}): Promise<DuffelPaymentIntentResource> {
  const res = await duffelFetch<unknown>("/payments/payment_intents", {
    method: "POST",
    body: JSON.stringify({
      data: { amount: input.amount, currency: input.currency },
    }),
  });
  return unwrapData<DuffelPaymentIntentResource>(res);
}

/** POST /payments/payment_intents/:id/actions/confirm */
export async function confirmDuffelPaymentIntent(paymentIntentId: string): Promise<DuffelPaymentIntentResource> {
  const res = await duffelFetch<unknown>(
    `/payments/payment_intents/${encodeURIComponent(paymentIntentId)}/actions/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ data: {} }),
    },
  );
  return unwrapData<DuffelPaymentIntentResource>(res);
}
