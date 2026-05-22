import "server-only";

import type { BookingFinancialEventType } from "@/lib/constants/booking-states";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import {
  adminEventLabel,
  classifyFlightFinancialEventDirection,
  customerEventLabel,
  type FinancialEventDirection,
} from "@/lib/services/flights/flight-financial-event-direction";
import type {
  AdminFlightLedgerQuery,
  MyFlightLedgerQuery,
} from "@/lib/validations/flight-ledger.schema";

const SAFE_CUSTOMER_PAYLOAD_KEYS = new Set([
  "refund_to",
  "payment_status",
  "duffel_cancellation_id",
  "duffel_order_change_id",
  "duffel_order_change_request_id",
  "partial",
]);

function redactPayloadForCustomer(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (!SAFE_CUSTOMER_PAYLOAD_KEYS.has(k)) continue;
    if (v !== null && typeof v === "object") continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

function sanitizePayloadForAdmin(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const p = { ...(payload as Record<string, unknown>) };
  delete p.raw;
  delete p.card;
  delete p.payment_method;
  return p;
}

function parseDayRange(from?: string, to?: string): { from?: Date; to?: Date } {
  const out: { from?: Date; to?: Date } = {};
  if (from) out.from = new Date(`${from}T00:00:00.000Z`);
  if (to) out.to = new Date(`${to}T23:59:59.999Z`);
  return out;
}

export type FlightLedgerListItem = {
  id: string;
  type: BookingFinancialEventType;
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
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

type LedgerRow = Awaited<
  ReturnType<typeof bookingFinancialEventRepository.listFlightLedgerForUser>
>[number];

function mapRow(
  row: LedgerRow,
  extras: { labelFn: (t: BookingFinancialEventType) => string; mode: "customer" | "admin" },
  emailByUserId?: Map<string, string>,
): FlightLedgerListItem | null {
  const booking = row.booking;
  if (!booking) return null;

  const type = row.type as BookingFinancialEventType;
  const direction = classifyFlightFinancialEventDirection(type, row.amount ?? null);
  const payload =
    extras.mode === "customer"
      ? redactPayloadForCustomer(row.payload)
      : sanitizePayloadForAdmin(row.payload);

  const uid = booking.user_id;
  const userRow = booking.user;
  let user: FlightLedgerListItem["user"];
  if (extras.mode === "admin" && uid && userRow) {
    user = {
      id: uid,
      first_name: userRow.first_name,
      last_name: userRow.last_name,
      email: emailByUserId?.get(uid) ?? "",
    };
  }

  return {
    id: row.id,
    type,
    direction,
    label: extras.labelFn(type),
    amount: row.amount ?? null,
    currency: row.currency ?? null,
    payload,
    created_at: row.created_at.toISOString(),
    booking: {
      id: booking.id,
      booking_ref_no: booking.booking_ref_no,
      airline_reference: booking.flightBooking?.booking_reference ?? null,
      user_id: booking.user_id,
    },
    ...(user ? { user } : {}),
  };
}

async function emailsForUserIds(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supa = createSupabaseServiceRoleClient();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data } = await supa.auth.admin.getUserById(id);
        map.set(id, data.user?.email ?? "");
      } catch {
        map.set(id, "");
      }
    }),
  );
  return map;
}

export async function listMyFlightLedgerEvents(input: {
  authz: AuthzContext | null;
  userId: string;
  query: MyFlightLedgerQuery;
}): Promise<{ items: FlightLedgerListItem[]; total: number; page: number; limit: number }> {
  if (!input.authz || !hasPermission(input.authz, "bookings:read_own")) {
    throw new ForbiddenError();
  }

  const { from, to } = parseDayRange(input.query.from, input.query.to);
  const skip = (input.query.page - 1) * input.query.limit;

  const [total, rows] = await Promise.all([
    bookingFinancialEventRepository.countFlightLedgerForUser({
      userId: input.userId,
      eventType: input.query.event_type,
      direction: input.query.direction,
      from,
      to,
    }),
    bookingFinancialEventRepository.listFlightLedgerForUser({
      userId: input.userId,
      skip,
      take: input.query.limit,
      order: input.query.order,
      eventType: input.query.event_type,
      direction: input.query.direction,
      from,
      to,
    }),
  ]);

  const items = rows
    .map((r) =>
      mapRow(r, { labelFn: customerEventLabel, mode: "customer" }),
    )
    .filter((x): x is FlightLedgerListItem => x != null);

  return {
    items,
    total,
    page: input.query.page,
    limit: input.query.limit,
  };
}

export async function listAdminFlightLedgerEvents(input: {
  authz: AuthzContext | null;
  query: AdminFlightLedgerQuery;
}): Promise<{ items: FlightLedgerListItem[]; total: number; page: number; limit: number }> {
  if (!input.authz || !hasPermission(input.authz, "bookings:read_all")) {
    throw new ForbiddenError();
  }

  const { from, to } = parseDayRange(input.query.from, input.query.to);
  const skip = (input.query.page - 1) * input.query.limit;

  const [total, rows] = await Promise.all([
    bookingFinancialEventRepository.countFlightLedgerForAdmin({
      q: input.query.q,
      eventType: input.query.event_type,
      direction: input.query.direction,
      from,
      to,
    }),
    bookingFinancialEventRepository.listFlightLedgerForAdmin({
      q: input.query.q,
      skip,
      take: input.query.limit,
      order: input.query.order,
      eventType: input.query.event_type,
      direction: input.query.direction,
      from,
      to,
    }),
  ]);

  const userIds = [
    ...new Set(
      rows.map((r) => r.booking?.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const emailByUserId = await emailsForUserIds(userIds);

  const items = rows
    .map((r) =>
      mapRow(r, { labelFn: adminEventLabel, mode: "admin" }, emailByUserId),
    )
    .filter((x): x is FlightLedgerListItem => x != null);

  return {
    items,
    total,
    page: input.query.page,
    limit: input.query.limit,
  };
}
