import "server-only";

import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import {
  checkoutPaymentToSnapshot,
  type StaysCheckoutPaymentSnapshot,
} from "@/lib/stays/stays-booking-display";

function readCheckoutPaymentId(guestData: unknown): string | null {
  if (!guestData || typeof guestData !== "object") return null;
  const id = (guestData as { checkout_payment_id?: unknown }).checkout_payment_id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

export async function resolveStaysCheckoutPaymentForBooking(input: {
  bookingId: string;
  guestData: unknown;
}): Promise<StaysCheckoutPaymentSnapshot | null> {
  const byBooking = await checkoutPaymentRepository.findFirstByBookingId(input.bookingId);
  if (byBooking) return checkoutPaymentToSnapshot(byBooking);

  const paymentId = readCheckoutPaymentId(input.guestData);
  if (!paymentId) return null;

  const byId = await checkoutPaymentRepository.findById(paymentId);
  return byId ? checkoutPaymentToSnapshot(byId) : null;
}
