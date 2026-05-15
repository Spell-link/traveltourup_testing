import "server-only";
import { duffelFetch } from "./client";

export type DuffelRefundResource = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  payment_intent_id: string;
  destination?: string;
  created_at?: string;
  updated_at?: string;
};

type Wrapped<T> = { data: T };

function unwrapData<T>(body: unknown): T {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid Duffel refund response");
  }
  const data = (body as Wrapped<T>).data;
  if (!data || typeof data !== "object") {
    throw new Error("Duffel refund response missing data");
  }
  return data as T;
}

/** `POST /payments/refunds` — see https://duffel.com/docs/api/refunds/create-refund */
export async function createDuffelPaymentRefund(input: {
  payment_intent_id: string;
  amount: string;
  currency: string;
}): Promise<DuffelRefundResource> {
  const res = await duffelFetch<unknown>("/payments/refunds", {
    method: "POST",
    body: JSON.stringify({
      data: {
        payment_intent_id: input.payment_intent_id,
        amount: input.amount,
        currency: input.currency,
      },
    }),
  });
  return unwrapData<DuffelRefundResource>(res);
}

/** `GET /payments/refunds/:id` — poll a previously created refund to lift `pending → succeeded/failed`. */
export async function getDuffelPaymentRefund(
  refundId: string,
): Promise<DuffelRefundResource> {
  const res = await duffelFetch<unknown>(
    `/payments/refunds/${encodeURIComponent(refundId)}`,
    { method: "GET" },
  );
  return unwrapData<DuffelRefundResource>(res);
}
