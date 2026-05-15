import "server-only";
import { duffelFetch } from "./client";

/** Create air order (full payload in P2). Optional `Idempotency-Key` matches client booking idempotency. */
export function createOrder(data: object, idempotencyKey?: string | null) {
  const headers: Record<string, string> = {};
  const key = idempotencyKey?.trim();
  if (key) headers["Idempotency-Key"] = key;
  return duffelFetch<unknown>("/air/orders", {
    method: "POST",
    body: JSON.stringify({ data }),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });
}

/** `GET /air/orders/:id` — webhook sync / support. */
export function getDuffelOrder(orderId: string) {
  return duffelFetch<unknown>(`/air/orders/${encodeURIComponent(orderId)}`);
}
