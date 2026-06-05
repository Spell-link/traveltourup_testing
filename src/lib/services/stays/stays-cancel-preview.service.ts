import "server-only";

import { AppError, NotFoundError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { parseStaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { resolveStaysCheckoutPaymentForBooking } from "@/lib/services/stays/resolve-stays-checkout-payment";
import { evaluateStayCancellationRefund } from "@/lib/stays/stay-cancellation-policy";

function assertCanRead(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingUserId: string | null;
}) {
  if (!input.authz) throw new ForbiddenError();
  if (hasPermission(input.authz, "bookings:read_all")) return;
  if (
    input.bookingUserId === input.userId &&
    hasPermission(input.authz, "bookings:read_own")
  ) {
    return;
  }
  throw new ForbiddenError();
}

export async function getStaysBookingCancelPreview(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}) {
  const row = await bookingRepository.findById(input.bookingId);
  if (!row) throw new NotFoundError("Booking");
  if (row.type !== "hotel" || !row.hotelBooking) {
    throw new AppError(400, "Not a hotel booking.", "VALIDATION_ERROR");
  }

  assertCanRead({
    authz: input.authz,
    userId: input.userId,
    bookingUserId: row.user_id,
  });

  const hb = row.hotelBooking;
  const checkoutPayment = await resolveStaysCheckoutPaymentForBooking({
    bookingId: row.id,
    guestData: row.guest_data,
  });
  const display = parseStaysBookingDisplay({
    staysRaw: hb.stays_raw,
    accommodationSnapshot: hb.accommodation_snapshot,
    guestData: row.guest_data,
    bookingReference: hb.booking_reference,
    duffelBookingId: hb.duffel_booking_id,
    totalAmount: row.total_amount.toString(),
    totalCurrency: row.currency,
    createdAt: row.created_at,
    status: row.status,
    checkoutPayment,
  });

  const estimate = evaluateStayCancellationRefund({
    cancellationTimeline: display.cancellationTimeline,
    totalAmount: display.billing.totalAmount,
    totalCurrency: display.billing.totalCurrency,
  });

  return {
    booking_id: row.id,
    booking_ref_no: row.booking_ref_no,
    hotel_confirmation: hb.booking_reference,
    status: row.status,
    ...estimate,
    cancellation_timeline: display.cancellationTimeline,
  };
}
