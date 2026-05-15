import "server-only";

import { randomBytes } from "crypto";
import { Prisma } from "@/generated/prisma";
import { AppError } from "@/lib/api/errors";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { staysCreateBooking } from "@/lib/duffel/stays-http";
import { parseStaysBooking } from "@/lib/duffel/stays-parse";
import { serializeBookingResponse } from "@/lib/services/booking.service";
import type { StaysBookingBodyInput } from "@/lib/validations/stays.schema";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";

function bookingRef(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(4).toString("hex");
  return `TTU-${t}-${r}`.toUpperCase();
}

export async function createDuffelStayBooking(input: {
  authz: AuthzContext | null;
  userId: string;
  body: StaysBookingBodyInput;
  idempotencyKey: string | null;
}) {
  if (!input.authz || !hasPermission(input.authz, "bookings:create")) {
    throw new ForbiddenError();
  }

  if (input.idempotencyKey) {
    const existing = await bookingRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return serializeBookingResponse(existing);
    }
  }

  const duffelBody: Record<string, unknown> = {
    quote_id: input.body.quote_id,
    email: input.body.email,
    phone_number: input.body.phone_number,
    guests: input.body.guests.map((g) => ({
      given_name: g.given_name,
      family_name: g.family_name,
      born_on: g.born_on,
    })),
    payment: {
      three_d_secure_session_id: input.body.payment.three_d_secure_session_id,
    },
  };
  if (input.body.accommodation_special_requests) {
    duffelBody.accommodation_special_requests = input.body.accommodation_special_requests;
  }

  const raw = await staysCreateBooking(duffelBody);
  const parsed = parseStaysBooking(raw);
  if (!parsed) {
    throw new AppError(502, "Stay booking response was invalid. Please contact support.", "STAYS_BOOKING_FAILED");
  }
  if (parsed.status && parsed.status !== "confirmed") {
    throw new AppError(502, "Stay booking is not confirmed. Please contact support.", "STAYS_BOOKING_FAILED");
  }

  const total = parsed.total_amount ?? "0";
  const currency = parsed.total_currency ?? "USD";
  const totalDec = new Prisma.Decimal(total);

  const row = await bookingRepository.createHotelStayBookingFromDuffel({
    booking_ref_no: bookingRef(),
    user_id: input.userId,
    type: "hotel",
    status: "confirmed",
    payment_status: "paid",
    total_amount: totalDec,
    currency,
    guest_data: {
      email: input.body.email,
      phone_number: input.body.phone_number,
      guests: input.body.guests,
    } as unknown as Prisma.InputJsonValue,
    idempotency_key: input.idempotencyKey,
    hotel: {
      duffel_booking_id: parsed.id,
      duffel_quote_id: input.body.quote_id,
      stays_search_result_id: null,
      duffel_accommodation_id:
        parsed.accommodation && typeof parsed.accommodation.id === "string"
          ? parsed.accommodation.id
          : null,
      booking_reference: parsed.reference,
      quote_expires_at: null,
      accommodation_snapshot: (parsed.accommodation ?? {}) as unknown as Prisma.InputJsonValue,
      stays_raw: raw as unknown as Prisma.InputJsonValue,
    },
  });

  return serializeBookingResponse(row);
}
