import "server-only";

import { AppError } from "@/lib/api/errors";
import { ForbiddenError } from "@/lib/authz/errors";
import { hasPermission, type AuthzContext } from "@/lib/authz";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { bookingFinancialEventRepository } from "@/lib/db/repositories/booking-financial-event.repository";
import type { BookingFinancialEventType } from "@/lib/constants/booking-states";

export type SerializedFinancialEvent = {
  id: string;
  type: BookingFinancialEventType;
  amount: string | null;
  currency: string | null;
  payload: unknown;
  created_at: string;
};

/**
 * Customer-visible money timeline for a booking. Auth: same rules as cancel
 * (`bookings:manage` or owner + `bookings:read_own`). Read-only.
 */
export async function listBookingFinancialEvents(input: {
  authz: AuthzContext | null;
  userId: string;
  bookingId: string;
}): Promise<SerializedFinancialEvent[]> {
  const booking = await bookingRepository.findById(input.bookingId);
  if (!booking) {
    throw new AppError(404, "Booking not found.", "NOT_FOUND");
  }

  if (!input.authz) throw new ForbiddenError();
  const isOwner = booking.user_id != null && booking.user_id === input.userId;
  const canManage = hasPermission(input.authz, "bookings:manage");
  const canReadOwn = hasPermission(input.authz, "bookings:read_own");
  if (!canManage && !(isOwner && canReadOwn)) {
    throw new ForbiddenError();
  }

  const rows = await bookingFinancialEventRepository.listForBooking(input.bookingId);
  return rows.map((r) => ({
    id: r.id,
    type: r.type as BookingFinancialEventType,
    amount: r.amount ?? null,
    currency: r.currency ?? null,
    payload: r.payload,
    created_at: r.created_at.toISOString(),
  }));
}
