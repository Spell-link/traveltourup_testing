import "server-only";

import { getSiteUrl } from "@/config/site-url";
import { sendFlightItineraryReadyEmail } from "@/lib/email/flight-itinerary-document.email";
import { logger } from "@/lib/obs/logger";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/storage/service";
import {
  buildFlightItineraryPdfBufferFromBooking,
  isCurrentItineraryPdfPath,
  passengersFromGuestData,
} from "@/lib/services/flights/flight-itinerary-pdf-input";

function truncateErr(msg: string): string {
  return msg.length > 500 ? `${msg.slice(0, 497)}...` : msg;
}

type BookingWithFlight = {
  id: string;
  booking_ref_no: string;
  guest_data: unknown;
  total_amount: { toString(): string };
  currency: string;
  status: string;
  payment_status: string;
  flightBooking: {
    id: string;
    itinerary_snapshot: unknown;
    order_raw?: unknown;
    booking_reference: string | null;
    duffel_order_id: string | null;
    ticket_pdf_storage_path?: string | null;
    ticket_pdf_generated_at?: Date | null;
    ticket_pdf_generation_failed_at?: Date | null;
    ticket_pdf_error?: string | null;
  } | null;
};

async function persistItineraryPdf(flightBookingId: string, pdfBuffer: Buffer): Promise<string> {
  const upload = await uploadToStorage({
    variantId: "flight-tickets",
    buffer: pdfBuffer,
    mime: "application/pdf",
    size: pdfBuffer.length,
    originalFilename: "itinerary.pdf",
    context: { flightBookingId },
  });

  await prisma.flightBooking.update({
    where: { id: flightBookingId },
    data: {
      ticket_pdf_storage_path: upload.path,
      ticket_pdf_generated_at: new Date(),
      ticket_pdf_generation_failed_at: null,
      ticket_pdf_error: null,
    },
  });

  return upload.path;
}

/**
 * Builds the same itinerary PDF as GET /api/v1/bookings/:id/itinerary and stores it privately.
 * Returns null on failure (confirmation email still sends without attachment).
 */
export async function tryGenerateAndPersistItineraryPdf(
  row: BookingWithFlight,
): Promise<Buffer | null> {
  const fb = row.flightBooking;
  if (!fb?.itinerary_snapshot) return null;

  try {
    const pdfBuffer = await buildFlightItineraryPdfBufferFromBooking(row, fb);
    const storagePath = await persistItineraryPdf(fb.id, pdfBuffer);
    const generatedAt = new Date();
    fb.ticket_pdf_storage_path = storagePath;
    fb.ticket_pdf_generated_at = generatedAt;
    fb.ticket_pdf_generation_failed_at = null;
    fb.ticket_pdf_error = null;
    return pdfBuffer;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.flightBooking.update({
      where: { id: fb.id },
      data: {
        ticket_pdf_generation_failed_at: new Date(),
        ticket_pdf_error: truncateErr(msg),
      },
    });
    logger.warn("Flight itinerary PDF generation failed at booking confirmation", {
      booking_id: row.id,
      flight_booking_id: fb.id,
      error_code: truncateErr(msg),
    });
    return null;
  }
}

/**
 * Generates a private itinerary PDF, stores it in Supabase, and optionally emails the traveler.
 * Idempotent unless `force` is true.
 *
 * When `sendStandaloneItineraryEmail` is true, sends a follow-up email only if this run newly
 * created the PDF (fallback when confirmation email could not attach it).
 */
export async function ensureFlightTicketAndNotify(
  bookingId: string,
  options?: { force?: boolean; sendStandaloneItineraryEmail?: boolean },
): Promise<void> {
  const force = options?.force === true;
  const sendStandaloneItineraryEmail = options?.sendStandaloneItineraryEmail === true;

  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { flightBooking: true },
  });

  if (!row || row.type !== "flight" || !row.flightBooking) {
    return;
  }

  const fb = row.flightBooking;
  const hadValidPdf = Boolean(
    fb.ticket_pdf_storage_path && isCurrentItineraryPdfPath(fb.ticket_pdf_storage_path),
  );

  if (!force && hadValidPdf) {
    return;
  }

  try {
    const pdfBuffer = await buildFlightItineraryPdfBufferFromBooking(row, fb);
    const passengers = passengersFromGuestData(row.guest_data);
    const storagePath = await persistItineraryPdf(fb.id, pdfBuffer);

    if (sendStandaloneItineraryEmail && !hadValidPdf) {
      const base = getSiteUrl().replace(/\/$/, "");
      const manageUrl = `${base}/profile/bookings/${encodeURIComponent(row.id)}`;
      await sendFlightItineraryReadyEmail({
        bookingRefNo: row.booking_ref_no,
        guestData: row.guest_data,
        passengers,
        manageUrl,
        pdfBuffer,
      });
    }

    logger.info("Flight itinerary PDF generated", {
      booking_id: row.id,
      flight_booking_id: fb.id,
      storage_path: storagePath,
      standalone_email: sendStandaloneItineraryEmail && !hadValidPdf,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.flightBooking.update({
      where: { id: fb.id },
      data: {
        ticket_pdf_generation_failed_at: new Date(),
        ticket_pdf_error: truncateErr(msg),
      },
    });
    logger.warn("Flight itinerary PDF generation failed", {
      booking_id: row.id,
      flight_booking_id: fb.id,
      error_code: truncateErr(msg),
    });
  }
}

export { passengersFromGuestData };
