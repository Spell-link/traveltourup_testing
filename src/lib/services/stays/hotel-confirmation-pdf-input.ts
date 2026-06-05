import "server-only";

import { parseStaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { resolveStaysCheckoutPaymentForBooking } from "@/lib/services/stays/resolve-stays-checkout-payment";
import {
  buildHotelConfirmationPdfBuffer,
  type BuildHotelConfirmationPdfInput,
} from "@/lib/services/stays/hotel-confirmation-pdf";
import {
  HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION,
  hotelConfirmationPdfStorageSuffix,
  isCurrentHotelConfirmationPdfPath,
} from "@/lib/hotels/confirmation-pdf.constants";

export {
  HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION,
  hotelConfirmationPdfStorageSuffix,
  isCurrentHotelConfirmationPdfPath,
};

type BookingWithHotel = {
  id: string;
  booking_ref_no: string;
  guest_data: unknown;
  total_amount: { toString(): string };
  currency: string;
  status: string;
  payment_status: string;
  created_at: Date;
  hotelBooking: {
    id: string;
    booking_reference: string | null;
    duffel_booking_id: string | null;
    accommodation_snapshot: unknown;
    stays_raw: unknown;
    confirmation_pdf_storage_path?: string | null;
    confirmation_pdf_generated_at?: Date | null;
    confirmation_pdf_generation_failed_at?: Date | null;
    confirmation_pdf_error?: string | null;
  } | null;
};

export async function buildHotelConfirmationPdfInputFromBooking(
  row: BookingWithHotel,
  hb: NonNullable<BookingWithHotel["hotelBooking"]>,
): Promise<BuildHotelConfirmationPdfInput> {
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

  return {
    bookingRefNo: row.booking_ref_no,
    hotelConfirmationRef: hb.booking_reference,
    display,
    bookingStatus: row.status,
    paymentStatus: row.payment_status,
  };
}

export async function buildHotelConfirmationPdfBufferFromBooking(
  row: BookingWithHotel,
  hb: NonNullable<BookingWithHotel["hotelBooking"]>,
): Promise<Buffer> {
  const pdfInput = await buildHotelConfirmationPdfInputFromBooking(row, hb);
  return buildHotelConfirmationPdfBuffer(pdfInput);
}
