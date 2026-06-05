import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";
import type { FlightLedgerDirectionFilter } from "@/lib/services/flights/flight-financial-event-direction";

/**
 * Append-only writer for the booking financial-event ledger.
 *
 * All flight money-moving paths emit one row per state transition. Reads (for
 * profile money-timeline and admin saga inspector) live in P3/P4 — keep this
 * module strictly write-shaped for now.
 *
 * The writer is best-effort and isolated by a try/catch at call sites: an
 * audit-log failure must never break a booking saga. Loss of one event row is
 * recoverable via `DuffelWebhookEvent` and the parent tables; loss of a
 * booking is not.
 */

const FLIGHT_BOOKING_TYPE = "flight";

function ledgerDirectionWhere(
  direction: FlightLedgerDirectionFilter,
): Prisma.BookingFinancialEventWhereInput {
  const debitBranches: Prisma.BookingFinancialEventWhereInput[] = [
    { type: { in: ["intent_succeeded", "order_placed"] } },
    {
      AND: [
        { type: "change_confirmed" },
        { amount: { not: null } },
        { NOT: { amount: { startsWith: "-" } } },
      ],
    },
  ];
  const creditBranches: Prisma.BookingFinancialEventWhereInput[] = [
    { type: { in: ["refund_initiated", "refund_succeeded"] } },
    {
      AND: [{ type: "cancel_confirmed" }, { amount: { not: null } }],
    },
    {
      AND: [
        { type: "change_confirmed" },
        { amount: { startsWith: "-" } },
      ],
    },
  ];

  if (direction === "debit") {
    return { OR: debitBranches };
  }
  if (direction === "credit") {
    return { OR: creditBranches };
  }
  return {
    AND: [{ NOT: { OR: debitBranches } }, { NOT: { OR: creditBranches } }],
  };
}

export type RecordBookingFinancialEventInput = {
  booking_id?: string | null;
  flight_payment_intent_record_id?: string | null;
  checkout_payment_record_id?: string | null;
  type: BookingFinancialEventType;
  amount?: string | null;
  currency?: string | null;
  payload?: Prisma.InputJsonValue | null;
  request_id?: string | null;
};

export const bookingFinancialEventRepository = {
  async record(input: RecordBookingFinancialEventInput) {
    const data: Prisma.BookingFinancialEventCreateInput = {
      type: input.type,
      ...(input.amount != null ? { amount: input.amount } : {}),
      ...(input.currency != null ? { currency: input.currency } : {}),
      ...(input.payload != null ? { payload: input.payload } : {}),
      ...(input.request_id != null ? { request_id: input.request_id } : {}),
      ...(input.booking_id
        ? { booking: { connect: { id: input.booking_id } } }
        : {}),
      ...(input.flight_payment_intent_record_id
        ? {
            flightPaymentIntentRecord: {
              connect: { id: input.flight_payment_intent_record_id },
            },
          }
        : {}),
      ...(input.checkout_payment_record_id
        ? {
            checkoutPaymentRecord: {
              connect: { id: input.checkout_payment_record_id },
            },
          }
        : {}),
    };
    return prisma.bookingFinancialEvent.create({ data });
  },

  async listForBooking(bookingId: string, limit = 100) {
    return prisma.bookingFinancialEvent.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: "asc" },
      take: limit,
    });
  },

  async listForPaymentIntent(flightPaymentIntentRecordId: string, limit = 100) {
    return prisma.bookingFinancialEvent.findMany({
      where: { flight_payment_intent_record_id: flightPaymentIntentRecordId },
      orderBy: { created_at: "asc" },
      take: limit,
    });
  },

  async countFlightLedgerForUser(input: {
    userId: string;
    eventType?: BookingFinancialEventType;
    direction?: FlightLedgerDirectionFilter;
    from?: Date;
    to?: Date;
  }) {
    return prisma.bookingFinancialEvent.count({
      where: {
        booking_id: { not: null },
        booking: {
          type: FLIGHT_BOOKING_TYPE,
          user_id: input.userId,
        },
        ...(input.eventType ? { type: input.eventType } : {}),
        ...(input.direction ? ledgerDirectionWhere(input.direction) : {}),
        ...(input.from || input.to
          ? {
              created_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
    });
  },

  async listFlightLedgerForUser(input: {
    userId: string;
    skip: number;
    take: number;
    order: "asc" | "desc";
    eventType?: BookingFinancialEventType;
    direction?: FlightLedgerDirectionFilter;
    from?: Date;
    to?: Date;
  }) {
    return prisma.bookingFinancialEvent.findMany({
      where: {
        booking_id: { not: null },
        booking: {
          type: FLIGHT_BOOKING_TYPE,
          user_id: input.userId,
        },
        ...(input.eventType ? { type: input.eventType } : {}),
        ...(input.direction ? ledgerDirectionWhere(input.direction) : {}),
        ...(input.from || input.to
          ? {
              created_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { created_at: input.order },
      skip: input.skip,
      take: input.take,
      include: {
        booking: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
            flightBooking: { select: { booking_reference: true } },
          },
        },
      },
    });
  },

  async countFlightLedgerForAdmin(input: {
    q?: string;
    eventType?: BookingFinancialEventType;
    direction?: FlightLedgerDirectionFilter;
    from?: Date;
    to?: Date;
  }) {
    const q = input.q?.trim();
    return prisma.bookingFinancialEvent.count({
      where: {
        booking_id: { not: null },
        booking: {
          type: FLIGHT_BOOKING_TYPE,
          ...(q
            ? {
                OR: [
                  { booking_ref_no: { contains: q, mode: "insensitive" } },
                  {
                    flightBooking: {
                      is: {
                        booking_reference: { contains: q, mode: "insensitive" },
                      },
                    },
                  },
                  { user: { first_name: { contains: q, mode: "insensitive" } } },
                  { user: { last_name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        ...(input.eventType ? { type: input.eventType } : {}),
        ...(input.direction ? ledgerDirectionWhere(input.direction) : {}),
        ...(input.from || input.to
          ? {
              created_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
    });
  },

  async listFlightLedgerForAdmin(input: {
    q?: string;
    skip: number;
    take: number;
    order: "asc" | "desc";
    eventType?: BookingFinancialEventType;
    direction?: FlightLedgerDirectionFilter;
    from?: Date;
    to?: Date;
  }) {
    const q = input.q?.trim();
    return prisma.bookingFinancialEvent.findMany({
      where: {
        booking_id: { not: null },
        booking: {
          type: FLIGHT_BOOKING_TYPE,
          ...(q
            ? {
                OR: [
                  { booking_ref_no: { contains: q, mode: "insensitive" } },
                  {
                    flightBooking: {
                      is: {
                        booking_reference: { contains: q, mode: "insensitive" },
                      },
                    },
                  },
                  { user: { first_name: { contains: q, mode: "insensitive" } } },
                  { user: { last_name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        ...(input.eventType ? { type: input.eventType } : {}),
        ...(input.direction ? ledgerDirectionWhere(input.direction) : {}),
        ...(input.from || input.to
          ? {
              created_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { created_at: input.order },
      skip: input.skip,
      take: input.take,
      include: {
        booking: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
            flightBooking: { select: { booking_reference: true } },
          },
        },
      },
    });
  },
};
