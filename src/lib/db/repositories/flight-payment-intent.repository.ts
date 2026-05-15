import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const flightPaymentIntentRepository = {
  findByIdempotencyKey(key: string) {
    return prisma.flightPaymentIntentRecord.findUnique({
      where: { idempotency_key: key },
    });
  },

  findByDuffelIntentId(duffelIntentId: string) {
    return prisma.flightPaymentIntentRecord.findUnique({
      where: { duffel_intent_id: duffelIntentId },
    });
  },

  findByOrderFailureBookingIdempotencyKey(key: string) {
    return prisma.flightPaymentIntentRecord.findUnique({
      where: { order_failure_booking_idempotency_key: key },
    });
  },

  findFirstByBookingId(bookingId: string) {
    return prisma.flightPaymentIntentRecord.findFirst({
      where: { booking_id: bookingId },
      orderBy: { created_at: "desc" },
    });
  },

  async create(input: {
    duffel_intent_id: string;
    offer_id: string;
    charge_amount: string;
    charge_currency: string;
    offer_amount: string;
    offer_currency: string;
    markup_amount: string;
    services_subtotal_amount: string;
    ancillary_selection?: Prisma.InputJsonValue;
    status: string;
    client_token: string;
    idempotency_key: string | null;
  }) {
    return prisma.flightPaymentIntentRecord.create({ data: input });
  },

  async updateStatusByDuffelId(duffelIntentId: string, status: string) {
    return prisma.flightPaymentIntentRecord.update({
      where: { duffel_intent_id: duffelIntentId },
      data: { status },
    });
  },

  async linkBooking(duffelIntentId: string, bookingId: string) {
    return prisma.flightPaymentIntentRecord.update({
      where: { duffel_intent_id: duffelIntentId },
      data: { booking_id: bookingId },
    });
  },

  async recordTerminalOrderFailure(input: {
    duffel_intent_id: string;
    order_failure_booking_idempotency_key: string | null;
    order_failure_code: string;
    order_failure_refund_id: string | null;
    order_failure_refund_status: string | null;
  }) {
    return prisma.flightPaymentIntentRecord.update({
      where: { duffel_intent_id: input.duffel_intent_id },
      data: {
        order_failure_at: new Date(),
        order_failure_booking_idempotency_key: input.order_failure_booking_idempotency_key,
        order_failure_code: input.order_failure_code,
        order_failure_refund_id: input.order_failure_refund_id,
        order_failure_refund_status: input.order_failure_refund_status,
      },
    });
  },
};
