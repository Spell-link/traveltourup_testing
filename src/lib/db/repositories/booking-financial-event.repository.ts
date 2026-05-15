import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";

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

export type RecordBookingFinancialEventInput = {
  booking_id?: string | null;
  flight_payment_intent_record_id?: string | null;
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
};
