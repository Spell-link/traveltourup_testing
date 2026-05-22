"use client";

import { apiJson } from "@/lib/http/api-client";
import type { FinancialEventDirection } from "@/lib/services/flights/flight-financial-event-direction";

const MY_FLIGHT_LEDGER_BASE = "/api/v1/me/flight-financial-events";

export type MyFlightLedgerItem = {
  id: string;
  type: string;
  direction: FinancialEventDirection;
  label: string;
  amount: string | null;
  currency: string | null;
  payload: unknown;
  created_at: string;
  booking: {
    id: string;
    booking_ref_no: string;
    airline_reference: string | null;
    user_id: string | null;
  };
};

export async function listMyFlightLedgerEvents(params?: {
  page?: number;
  limit?: number;
  sort?: "created_at";
  order?: "asc" | "desc";
  event_type?: string;
  direction?: string;
  from?: string;
  to?: string;
}) {
  const u = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") u.set(k, String(v));
    }
  }
  const qs = u.toString();
  const payload = await apiJson<{
    items: MyFlightLedgerItem[];
    total: number;
    page: number;
    limit: number;
  }>(`${MY_FLIGHT_LEDGER_BASE}${qs ? `?${qs}` : ""}`);

  const totalPages = payload.limit > 0 ? Math.ceil(payload.total / payload.limit) : 0;
  return {
    data: payload.items,
    meta: {
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      totalPages,
    },
  };
}
