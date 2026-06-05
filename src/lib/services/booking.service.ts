import "server-only";

import { randomBytes } from "crypto";
import { Prisma } from "@/generated/prisma";
import { NotFoundError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import {
  bookingRepository,
  type BookingWithChildren,
} from "@/lib/db/repositories/booking.repository";
import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import {
  checkoutPaymentToSnapshot,
  type StaysCheckoutPaymentSnapshot,
} from "@/lib/stays/stays-booking-display";
import {
  serializeBookingListWithRelations,
  serializeBookingWithRelations,
} from "@/lib/api/serialize";
import {
  bookingQuerySchema,
  createBookingSchema,
  patchBookingSchema,
} from "@/lib/validations/booking.schema";
import type { z } from "zod";

type BookingQuery = z.infer<typeof bookingQuerySchema>;
type CreateBookingBody = z.infer<typeof createBookingSchema>;
type PatchBookingBody = z.infer<typeof patchBookingSchema>;

function bookingRef(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(4).toString("hex");
  return `TTU-${t}-${r}`.toUpperCase();
}

export function serializeBookingResponse(row: BookingWithChildren) {
  return serializeBookingWithRelations(row);
}

export async function listBookings(input: {
  authz: AuthzContext | null;
  requestingUserId: string;
  query: BookingQuery;
}) {
  if (!input.authz) {
    throw new ForbiddenError();
  }

  const canReadAll = hasPermission(input.authz, "bookings:read_all");
  if (!canReadAll && !hasPermission(input.authz, "bookings:read_own")) {
    throw new ForbiddenError();
  }

  const q = input.query.q?.trim();
  const where: Prisma.BookingWhereInput = {
    ...(canReadAll ? {} : { user_id: input.requestingUserId }),
    ...(input.query.status ? { status: input.query.status } : {}),
    ...(input.query.type ? { type: input.query.type } : {}),
    ...(q
      ? {
          booking_ref_no: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const orderBy: Prisma.BookingOrderByWithRelationInput = {
    [input.query.sort]: input.query.order,
  };

  const skip = (input.query.page - 1) * input.query.limit;
  const { rows, total } = await bookingRepository.findManyPaginatedList({
    where,
    skip,
    take: input.query.limit,
    orderBy,
  });

  return {
    items: rows.map((row) => serializeBookingListWithRelations(row)),
    total,
    page: input.query.page,
    limit: input.query.limit,
  };
}

export async function getBookingById(input: {
  authz: AuthzContext | null;
  requestingUserId: string;
  id: string;
}) {
  if (!input.authz) {
    throw new ForbiddenError();
  }

  const canReadAll = hasPermission(input.authz, "bookings:read_all");
  if (!canReadAll && !hasPermission(input.authz, "bookings:read_own")) {
    throw new ForbiddenError();
  }

  let row = await bookingRepository.findById(input.id);
  if (!row) {
    throw new NotFoundError("Booking");
  }

  if (!canReadAll && row.user_id !== input.requestingUserId) {
    throw new ForbiddenError();
  }

  const serialized = serializeBookingResponse(row);
  if (row.type !== "hotel") {
    return serialized;
  }

  const payment = await checkoutPaymentRepository.findFirstByBookingId(row.id);
  const pricing_breakdown: StaysCheckoutPaymentSnapshot | null = payment
    ? checkoutPaymentToSnapshot(payment)
    : null;

  return { ...serialized, pricing_breakdown };
}

export async function createBooking(input: {
  authz: AuthzContext | null;
  requestingUserId: string;
  body: CreateBookingBody;
}) {
  if (!input.authz || !hasPermission(input.authz, "bookings:create")) {
    throw new ForbiddenError();
  }

  const guest =
    input.body.guest_data === undefined || input.body.guest_data === null
      ? undefined
      : (input.body.guest_data as Prisma.InputJsonValue);

  let flightPayload: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (input.body.flight_booking) {
    flightPayload =
      input.body.flight_booking.payload === undefined
        ? Prisma.JsonNull
        : (input.body.flight_booking.payload as Prisma.InputJsonValue);
  }

  let hotelPayload: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (input.body.hotel_booking) {
    hotelPayload =
      input.body.hotel_booking.payload === undefined
        ? Prisma.JsonNull
        : (input.body.hotel_booking.payload as Prisma.InputJsonValue);
  }

  let carPayload: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (input.body.car_booking) {
    carPayload =
      input.body.car_booking.payload === undefined
        ? Prisma.JsonNull
        : (input.body.car_booking.payload as Prisma.InputJsonValue);
  }

  const row = await bookingRepository.createWithChildren({
    booking_ref_no: bookingRef(),
    user_id: input.requestingUserId,
    type: input.body.type,
    status: input.body.status,
    payment_status: input.body.payment_status,
    total_amount: new Prisma.Decimal(String(input.body.total_amount)),
    currency: input.body.currency,
    guest_data: guest,
    flightPayload,
    hotelPayload,
    carPayload,
  });

  return serializeBookingResponse(row);
}

export async function patchBooking(input: {
  authz: AuthzContext | null;
  requestingUserId: string;
  id: string;
  body: PatchBookingBody;
}) {
  if (!input.authz) {
    throw new ForbiddenError();
  }

  const row = await bookingRepository.findById(input.id);
  if (!row) {
    throw new NotFoundError("Booking");
  }

  const canManage = hasPermission(input.authz, "bookings:manage");
  const isOwner = row.user_id === input.requestingUserId;

  if (canManage) {
    const updates: { status?: string; payment_status?: string } = {};
    if (input.body.status !== undefined) updates.status = input.body.status;
    if (input.body.payment_status !== undefined) updates.payment_status = input.body.payment_status;
    if (Object.keys(updates).length === 0) {
      return serializeBookingResponse(row);
    }
    const next = await bookingRepository.updateById(row.id, updates);
    return serializeBookingResponse(next);
  }

  if (!isOwner || !hasPermission(input.authz, "bookings:cancel_own")) {
    throw new ForbiddenError();
  }

  if (input.body.payment_status !== undefined) {
    throw new ForbiddenError();
  }
  if (input.body.status !== "cancelled") {
    throw new ForbiddenError();
  }

  const next = await bookingRepository.updateById(row.id, { status: input.body.status });
  return serializeBookingResponse(next);
}

export async function deleteBooking(input: {
  authz: AuthzContext | null;
  id: string;
}) {
  if (!input.authz || !hasPermission(input.authz, "bookings:manage")) {
    throw new ForbiddenError();
  }

  const row = await bookingRepository.findById(input.id);
  if (!row) {
    throw new NotFoundError("Booking");
  }

  await bookingRepository.deleteById(input.id);
}
