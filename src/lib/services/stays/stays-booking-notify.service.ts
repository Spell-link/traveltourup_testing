import "server-only";

import { accommodationName } from "@/lib/bookings/booking-summary";
import { sendHotelBookingConfirmationEmailSafe } from "@/lib/email/hotel-booking-confirmation.email";
import { logger } from "@/lib/obs/logger";
import { prisma } from "@/lib/prisma";
import { parseStaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { resolveStaysCheckoutPaymentForBooking } from "@/lib/services/stays/resolve-stays-checkout-payment";
import { tryGenerateAndPersistHotelConfirmationPdf } from "@/lib/services/stays/hotel-voucher-document.service";

function accommodationCity(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const loc = (snapshot as { location?: { city?: string; city_name?: string } }).location;
  if (!loc || typeof loc !== "object") return null;
  const city =
    typeof loc.city === "string" && loc.city.trim()
      ? loc.city.trim()
      : typeof loc.city_name === "string" && loc.city_name.trim()
        ? loc.city_name.trim()
        : null;
  return city;
}

function hotelDestinationLine(snapshot: unknown): string {
  const name = accommodationName(snapshot) ?? "Your hotel";
  const city = accommodationCity(snapshot);
  return city ? `${name}, ${city}` : name;
}

/**
 * Background work after a hotel booking row exists: send confirmation email.
 * Keeps POST /stays/bookings fast (Duffel book + capture only on critical path).
 */
export async function notifyStayBookingConfirmed(bookingId: string): Promise<void> {
  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { hotelBooking: true },
  });

  if (!row || row.type !== "hotel" || !row.hotelBooking) {
    return;
  }

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

  const hotelName = hotelDestinationLine(hb.accommodation_snapshot);
  const chargedAmount = display.billing.totalPaidAmount ?? row.total_amount.toString();
  const chargedCurrency = display.billing.totalPaidCurrency ?? row.currency;
  const billing = display.billing;

  const confirmationPdf = await tryGenerateAndPersistHotelConfirmationPdf(row);

  await sendHotelBookingConfirmationEmailSafe({
    bookingId: row.id,
    bookingRefNo: row.booking_ref_no,
    hotelName,
    hotelConfirmationReference: hb.booking_reference,
    checkIn: display.checkInDate,
    checkOut: display.checkOutDate,
    display,
    contactEmail: display.contactEmail,
    chargedAmount,
    chargedCurrency,
    confirmationPdf,
  });

  logger.info("Hotel booking confirmation notified", {
    booking_id: row.id,
    hotel_confirmation: hb.booking_reference,
    voucher_attached: Boolean(confirmationPdf?.length),
    guests_count: display.guests.length,
    billing_total_paid: billing.totalPaidAmount,
  });
}
