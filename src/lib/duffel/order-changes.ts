import "server-only";
import { duffelFetch } from "./client";

/**
 * Duffel Order Change flow (voluntary):
 *   1. POST /air/order_change_requests    → returns offers (`oce_*`)
 *   2. POST /air/order_changes            → confirm the chosen offer
 *   3. (optional) POST .../actions/confirm if the change is held pending payment
 *
 * The `slices` body conforms to Duffel's spec:
 *   { add: [{ origin, destination, departure_date, cabin_class }],
 *     remove: [{ slice_id }] }
 *
 * See https://duffel.com/docs/api/order-change-requests/create-order-change-request
 */

export type DuffelOrderChangeSlicesBody = {
  add?: Array<{
    origin: string;
    destination: string;
    departure_date: string;
    cabin_class?: string;
  }>;
  remove?: Array<{ slice_id: string }>;
};

export function createOrderChangeRequest(input: {
  orderId: string;
  slices: DuffelOrderChangeSlicesBody;
  privateFares?: Record<string, unknown> | null;
}) {
  const data: Record<string, unknown> = {
    order_id: input.orderId,
    slices: input.slices,
  };
  if (input.privateFares) data.private_fares = input.privateFares;
  return duffelFetch<unknown>("/air/order_change_requests", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export function getOrderChangeRequest(orderChangeRequestId: string) {
  return duffelFetch<unknown>(
    `/air/order_change_requests/${encodeURIComponent(orderChangeRequestId)}`,
    { method: "GET" },
  );
}

/** Pick a specific change offer from a request (`oce_*`). */
export function createOrderChange(orderChangeOfferId: string) {
  return duffelFetch<unknown>("/air/order_changes", {
    method: "POST",
    body: JSON.stringify({
      data: { selected_order_change_offer: orderChangeOfferId },
    }),
  });
}

/** Confirm a pending order change (when not auto-confirmed by the airline). */
export function confirmOrderChange(
  orderChangeId: string,
  payment?: { type: "balance"; amount: string; currency: string },
) {
  const data: Record<string, unknown> = {};
  if (payment) {
    data.payment = payment;
  }
  return duffelFetch<unknown>(
    `/air/order_changes/${encodeURIComponent(orderChangeId)}/actions/confirm`,
    { method: "POST", body: JSON.stringify({ data }) },
  );
}

export function getOrderChange(orderChangeId: string) {
  return duffelFetch<unknown>(`/air/order_changes/${encodeURIComponent(orderChangeId)}`, {
    method: "GET",
  });
}
