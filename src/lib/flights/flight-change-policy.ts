/**
 * Duffel order policy checks for voluntary order changes (client + server).
 */

export type FlightChangePolicyResult = {
  allowed: boolean;
  message: string;
};

function readObj(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function unwrapOrderData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

const MSG_NOT_CHANGEABLE = "This order is not changeable";
const MSG_CHANGEABLE = "This order is changeable";

/**
 * Evaluates whether the Duffel order allows voluntary changes per stored `order_raw`.
 * Uses `available_actions` when present, then `conditions.change_before_departure`.
 */
export function evaluateFlightChangePolicy(orderRaw: unknown): FlightChangePolicyResult {
  const order = unwrapOrderData(orderRaw);
  if (!order) {
    return { allowed: false, message: MSG_NOT_CHANGEABLE };
  }

  const actions = order.available_actions;
  if (Array.isArray(actions)) {
    const hasChange = actions.some((a) => a === "change");
    if (!hasChange) {
      return { allowed: false, message: MSG_NOT_CHANGEABLE };
    }
  }

  const conditions = readObj(order.conditions);
  const change = readObj(conditions?.change_before_departure);
  if (change && change.allowed === false) {
    return { allowed: false, message: MSG_NOT_CHANGEABLE };
  }

  if (change?.allowed === true) {
    return { allowed: true, message: MSG_CHANGEABLE };
  }

  // `available_actions` includes change but explicit condition missing — allow attempt
  if (Array.isArray(actions) && actions.includes("change")) {
    return { allowed: true, message: MSG_CHANGEABLE };
  }

  if (change?.allowed !== false) {
    return { allowed: true, message: MSG_CHANGEABLE };
  }

  return { allowed: false, message: MSG_NOT_CHANGEABLE };
}

export function canChangeFlightBooking(input: {
  status: string;
  duffelOrderId: string | null | undefined;
  orderRaw: unknown;
  changeableSlices: boolean;
}): boolean {
  if (input.status !== "confirmed") return false;
  if (!input.duffelOrderId) return false;
  if (!input.changeableSlices) return false;
  return evaluateFlightChangePolicy(input.orderRaw).allowed;
}
