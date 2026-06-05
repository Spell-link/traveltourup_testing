import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const checkoutPaymentRepository = {
  findById(id: string) {
    return prisma.checkoutPaymentRecord.findUnique({ where: { id } });
  },

  findByIdempotencyKey(key: string) {
    return prisma.checkoutPaymentRecord.findUnique({ where: { idempotency_key: key } });
  },

  findByProviderIntentId(providerIntentId: string) {
    return prisma.checkoutPaymentRecord.findUnique({
      where: { provider_intent_id: providerIntentId },
    });
  },

  findFirstByBookingId(bookingId: string) {
    return prisma.checkoutPaymentRecord.findFirst({
      where: { booking_id: bookingId },
      orderBy: { created_at: "desc" },
    });
  },

  async create(input: {
    product_type: string;
    provider: string;
    provider_intent_id: string;
    supplier_ref_id: string;
    user_id: string;
    supplier_amount: string;
    supplier_currency: string;
    markup_amount: string;
    commission_percent_applied?: string | null;
    markup_fixed_applied?: string | null;
    charge_amount: string;
    charge_currency: string;
    customer_currency_requested?: string | null;
    charge_currency_fallback: boolean;
    fx_rate_applied?: string | null;
    fx_snapshot_json?: Prisma.InputJsonValue;
    stripe_fee_rate?: string | null;
    client_secret: string;
    status: string;
    idempotency_key?: string | null;
    quote_expires_at?: Date | null;
  }) {
    return prisma.checkoutPaymentRecord.create({ data: input });
  },

  async updateStatus(id: string, status: string) {
    return prisma.checkoutPaymentRecord.update({
      where: { id },
      data: { status },
    });
  },

  async linkBooking(id: string, bookingId: string) {
    return prisma.checkoutPaymentRecord.update({
      where: { id },
      data: { booking_id: bookingId, status: "captured" },
    });
  },

  async recordTerminalOrderFailure(input: {
    id: string;
    order_failure_booking_idempotency_key: string | null;
    order_failure_code: string;
    order_failure_refund_id: string | null;
    order_failure_refund_status: string | null;
  }) {
    return prisma.checkoutPaymentRecord.update({
      where: { id: input.id },
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

export const paymentRefundAttemptRepository = {
  findByStaysCancellationId(staysCancellationId: string) {
    return prisma.paymentRefundAttempt.findUnique({
      where: { stays_cancellation_id: staysCancellationId },
    });
  },

  async create(input: {
    booking_id: string;
    checkout_payment_record_id?: string | null;
    stays_cancellation_id?: string | null;
    provider: string;
    amount?: string | null;
    currency?: string | null;
    status: string;
    provider_refund_id?: string | null;
    error_code?: string | null;
    raw?: Prisma.InputJsonValue;
  }) {
    return prisma.paymentRefundAttempt.create({ data: input });
  },

  async updateStatus(
    id: string,
    input: {
      status: string;
      provider_refund_id?: string | null;
      error_code?: string | null;
      raw?: Prisma.InputJsonValue;
    },
  ) {
    return prisma.paymentRefundAttempt.update({
      where: { id },
      data: input,
    });
  },
};

export const staysCancellationRepository = {
  findByHotelBookingId(hotelBookingId: string) {
    return prisma.staysBookingCancellation.findFirst({
      where: { hotel_booking_id: hotelBookingId, status: "confirmed" },
      orderBy: { created_at: "desc" },
    });
  },

  async create(input: {
    hotel_booking_id: string;
    checkout_payment_record_id?: string | null;
    duffel_booking_id: string;
    status: string;
    refund_amount?: string | null;
    refund_currency?: string | null;
    customer_refund_amount?: string | null;
    customer_refund_currency?: string | null;
    raw?: Prisma.InputJsonValue;
  }) {
    return prisma.staysBookingCancellation.create({ data: input });
  },

  async markConfirmed(id: string, input: {
    refund_amount?: string | null;
    refund_currency?: string | null;
    customer_refund_amount?: string | null;
    customer_refund_currency?: string | null;
    raw?: Prisma.InputJsonValue;
  }) {
    return prisma.staysBookingCancellation.update({
      where: { id },
      data: { ...input, status: "confirmed", confirmed_at: new Date() },
    });
  },
};
