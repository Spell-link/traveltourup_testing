import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { ParsedOrderAncillaryRow } from "@/lib/duffel/order-parse";

const bookingInclude = {
  flightBooking: {
    include: {
      ancillaries: true,
      orderCancellations: { orderBy: { created_at: "desc" as const } },
    },
  },
  hotelBooking: true,
  carBooking: true,
} as const;

/** List rows: omit large blobs (`order_raw`, `stays_raw`, nested ancillaries). */
export const bookingListInclude = {
  flightBooking: {
    select: {
      id: true,
      booking_id: true,
      duffel_order_id: true,
      duffel_offer_id: true,
      duffel_offer_request_id: true,
      booking_reference: true,
      live_mode: true,
      last_offer_total_amount: true,
      last_offer_total_currency: true,
      offer_expires_at: true,
      itinerary_snapshot: true,
      ticket_pdf_storage_path: true,
      ticket_pdf_generated_at: true,
      ticket_pdf_generation_failed_at: true,
      created_at: true,
      updated_at: true,
    },
  },
  hotelBooking: {
    select: {
      id: true,
      booking_id: true,
      duffel_booking_id: true,
      duffel_quote_id: true,
      stays_search_result_id: true,
      duffel_accommodation_id: true,
      booking_reference: true,
      quote_expires_at: true,
      accommodation_snapshot: true,
      created_at: true,
      updated_at: true,
    },
  },
  carBooking: {
    select: {
      id: true,
      booking_id: true,
      payload: true,
      created_at: true,
      updated_at: true,
    },
  },
} as const;

export type BookingWithChildren = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export type BookingWithListChildren = Prisma.BookingGetPayload<{ include: typeof bookingListInclude }>;

export const bookingRepository = {
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
  },

  async findByRef(bookingRefNo: string) {
    return prisma.booking.findUnique({
      where: { booking_ref_no: bookingRefNo },
      include: bookingInclude,
    });
  },

  async findByIdempotencyKey(key: string) {
    return prisma.booking.findUnique({
      where: { idempotency_key: key },
      include: bookingInclude,
    });
  },

  async findManyPaginated(args: {
    where: Prisma.BookingWhereInput;
    skip: number;
    take: number;
  }) {
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where: args.where,
        orderBy: { created_at: "desc" },
        skip: args.skip,
        take: args.take,
        include: bookingInclude,
      }),
      prisma.booking.count({ where: args.where }),
    ]);
    return { rows, total };
  },

  async findManyPaginatedList(args: {
    where: Prisma.BookingWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.BookingOrderByWithRelationInput;
  }) {
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where: args.where,
        orderBy: args.orderBy ?? { created_at: "desc" },
        skip: args.skip,
        take: args.take,
        include: bookingListInclude,
      }),
      prisma.booking.count({ where: args.where }),
    ]);
    return { rows, total };
  },

  async createFlightBookingFromDuffelOrder(input: {
    booking_ref_no: string;
    user_id: string;
    type: string;
    status: string;
    payment_status: string;
    total_amount: Prisma.Decimal;
    currency: string;
    guest_data?: Prisma.InputJsonValue;
    idempotency_key?: string | null;
    /** When set, links `FlightPaymentIntentRecord` to this booking in the same transaction. */
    linkDuffelPaymentIntentId?: string | null;
    ancillaries?: ParsedOrderAncillaryRow[];
    flight: {
      duffel_order_id: string;
      duffel_offer_id: string;
      booking_reference: string | null;
      live_mode: boolean;
      last_offer_total_amount: Prisma.Decimal;
      last_offer_total_currency: string;
      offer_expires_at: Date | null;
      itinerary_snapshot: Prisma.InputJsonValue;
      order_raw: Prisma.InputJsonValue;
      payload?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          booking_ref_no: input.booking_ref_no,
          user_id: input.user_id,
          type: input.type,
          status: input.status,
          payment_status: input.payment_status,
          total_amount: input.total_amount,
          currency: input.currency,
          guest_data: input.guest_data,
          idempotency_key: input.idempotency_key ?? undefined,
        },
      });

      const flightRow = await tx.flightBooking.create({
        data: {
          booking_id: booking.id,
          duffel_order_id: input.flight.duffel_order_id,
          duffel_offer_id: input.flight.duffel_offer_id,
          booking_reference: input.flight.booking_reference,
          live_mode: input.flight.live_mode,
          last_offer_total_amount: input.flight.last_offer_total_amount,
          last_offer_total_currency: input.flight.last_offer_total_currency,
          offer_expires_at: input.flight.offer_expires_at ?? undefined,
          itinerary_snapshot: input.flight.itinerary_snapshot,
          order_raw: input.flight.order_raw,
          payload: input.flight.payload ?? Prisma.JsonNull,
        },
      });

      if (input.ancillaries?.length) {
        await tx.bookingAncillary.createMany({
          data: input.ancillaries.map((a) => ({
            flight_booking_id: flightRow.id,
            type: a.type,
            duffel_service_id: a.duffel_service_id,
            passenger_id: a.passenger_id,
            segment_id: a.segment_id,
            amount: a.amount,
            currency: a.currency,
            status: a.status,
            raw: a.raw ?? Prisma.JsonNull,
          })),
        });
      }

      if (input.linkDuffelPaymentIntentId) {
        await tx.flightPaymentIntentRecord.update({
          where: { duffel_intent_id: input.linkDuffelPaymentIntentId },
          data: { booking_id: booking.id },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    });
  },

  async createWithChildren(input: {
    booking_ref_no: string;
    user_id: string | null;
    type: string;
    status: string;
    payment_status: string;
    total_amount: Prisma.Decimal;
    currency: string;
    guest_data?: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    flightPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    hotelPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    carPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          booking_ref_no: input.booking_ref_no,
          user_id: input.user_id ?? undefined,
          type: input.type,
          status: input.status,
          payment_status: input.payment_status,
          total_amount: input.total_amount,
          currency: input.currency,
          guest_data: input.guest_data,
        },
      });

      if (input.flightPayload !== undefined) {
        await tx.flightBooking.create({
          data: { booking_id: booking.id, payload: input.flightPayload },
        });
      }
      if (input.hotelPayload !== undefined) {
        await tx.hotelBooking.create({
          data: { booking_id: booking.id, payload: input.hotelPayload },
        });
      }
      if (input.carPayload !== undefined) {
        await tx.carBooking.create({
          data: { booking_id: booking.id, payload: input.carPayload },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    });
  },

  async updateById(
    id: string,
    data: { status?: string; payment_status?: string },
  ) {
    return prisma.booking.update({
      where: { id },
      data,
      include: bookingInclude,
    });
  },

  async deleteById(id: string) {
    return prisma.booking.delete({
      where: { id },
    });
  },

  async findFlightBookingRowByDuffelOrderId(duffelOrderId: string) {
    return prisma.flightBooking.findUnique({
      where: { duffel_order_id: duffelOrderId },
      select: { id: true, booking_id: true, duffel_order_id: true },
    });
  },

  async findHotelBookingRowByDuffelBookingId(duffelBookingId: string) {
    return prisma.hotelBooking.findUnique({
      where: { duffel_booking_id: duffelBookingId },
      select: { id: true, booking_id: true, duffel_booking_id: true },
    });
  },

  async createHotelStayBookingFromDuffel(input: {
    booking_ref_no: string;
    user_id: string;
    type: string;
    status: string;
    payment_status: string;
    total_amount: Prisma.Decimal;
    currency: string;
    guest_data?: Prisma.InputJsonValue;
    idempotency_key?: string | null;
    hotel: {
      duffel_booking_id: string;
      duffel_quote_id: string | null;
      stays_search_result_id: string | null;
      duffel_accommodation_id: string | null;
      booking_reference: string | null;
      quote_expires_at: Date | null;
      accommodation_snapshot: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      stays_raw: Prisma.InputJsonValue;
      payload?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          booking_ref_no: input.booking_ref_no,
          user_id: input.user_id,
          type: input.type,
          status: input.status,
          payment_status: input.payment_status,
          total_amount: input.total_amount,
          currency: input.currency,
          guest_data: input.guest_data,
          idempotency_key: input.idempotency_key ?? undefined,
        },
      });

      await tx.hotelBooking.create({
        data: {
          booking_id: booking.id,
          duffel_booking_id: input.hotel.duffel_booking_id,
          duffel_quote_id: input.hotel.duffel_quote_id ?? undefined,
          stays_search_result_id: input.hotel.stays_search_result_id ?? undefined,
          duffel_accommodation_id: input.hotel.duffel_accommodation_id ?? undefined,
          booking_reference: input.hotel.booking_reference ?? undefined,
          quote_expires_at: input.hotel.quote_expires_at ?? undefined,
          accommodation_snapshot: input.hotel.accommodation_snapshot,
          stays_raw: input.hotel.stays_raw,
          payload: input.hotel.payload ?? Prisma.JsonNull,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    });
  },

  async findLatestPendingOrderCancellation(flightBookingId: string) {
    return prisma.flightOrderCancellation.findFirst({
      where: { flight_booking_id: flightBookingId, status: "pending" },
      orderBy: { created_at: "desc" },
    });
  },

  async supersedePendingOrderCancellations(flightBookingId: string) {
    return prisma.flightOrderCancellation.updateMany({
      where: { flight_booking_id: flightBookingId, status: "pending" },
      data: { status: "superseded" },
    });
  },
};
