import "server-only";
import { duffelFetch } from "./client";

/** `POST /air/order_cancellations` — returns pending quote (`ore_*`). */
export function createOrderCancellation(orderId: string) {
  return duffelFetch<unknown>("/air/order_cancellations", {
    method: "POST",
    body: JSON.stringify({ data: { order_id: orderId } }),
  });
}

/** `POST /air/order_cancellations/:id/actions/confirm` — JSON:API envelope `{ data: {} }`. */
export function confirmOrderCancellation(duffelCancellationId: string) {
  return duffelFetch<unknown>(
    `/air/order_cancellations/${encodeURIComponent(duffelCancellationId)}/actions/confirm`,
    { method: "POST", body: JSON.stringify({ data: {} }) },
  );
}
