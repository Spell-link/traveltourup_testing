import "server-only";

import { logger } from "@/lib/obs/logger";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/storage/service";
import {
  buildHotelConfirmationPdfBufferFromBooking,
  isCurrentHotelConfirmationPdfPath,
} from "@/lib/services/stays/hotel-confirmation-pdf-input";

function truncateErr(msg: string): string {
  return msg.length > 500 ? `${msg.slice(0, 497)}...` : msg;
}

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

async function persistConfirmationPdf(hotelBookingId: string, pdfBuffer: Buffer): Promise<string> {
  const upload = await uploadToStorage({
    variantId: "hotel-vouchers",
    buffer: pdfBuffer,
    mime: "application/pdf",
    size: pdfBuffer.length,
    originalFilename: "confirmation.pdf",
    context: { hotelBookingId },
  });

  await prisma.hotelBooking.update({
    where: { id: hotelBookingId },
    data: {
      confirmation_pdf_storage_path: upload.path,
      confirmation_pdf_generated_at: new Date(),
      confirmation_pdf_generation_failed_at: null,
      confirmation_pdf_error: null,
    },
  });

  return upload.path;
}

export function canBuildHotelConfirmationPdf(hb: {
  accommodation_snapshot: unknown;
  stays_raw: unknown;
}): boolean {
  return Boolean(hb.stays_raw ?? hb.accommodation_snapshot);
}

export async function tryGenerateAndPersistHotelConfirmationPdf(
  row: BookingWithHotel,
): Promise<Buffer | null> {
  const hb = row.hotelBooking;
  if (!hb || !canBuildHotelConfirmationPdf(hb)) return null;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildHotelConfirmationPdfBufferFromBooking(row, hb);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.hotelBooking.update({
      where: { id: hb.id },
      data: {
        confirmation_pdf_generation_failed_at: new Date(),
        confirmation_pdf_error: truncateErr(msg),
      },
    });
    logger.warn("Hotel confirmation PDF generation failed", {
      booking_id: row.id,
      hotel_booking_id: hb.id,
      error_code: truncateErr(msg),
    });
    return null;
  }

  try {
    const storagePath = await persistConfirmationPdf(hb.id, pdfBuffer);
    hb.confirmation_pdf_storage_path = storagePath;
    hb.confirmation_pdf_generated_at = new Date();
    hb.confirmation_pdf_generation_failed_at = null;
    hb.confirmation_pdf_error = null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Hotel confirmation PDF built but storage upload failed", {
      booking_id: row.id,
      hotel_booking_id: hb.id,
      error_code: truncateErr(msg),
    });
    await prisma.hotelBooking.update({
      where: { id: hb.id },
      data: {
        confirmation_pdf_generation_failed_at: null,
        confirmation_pdf_error: null,
      },
    });
  }

  return pdfBuffer;
}

export async function ensureHotelVoucherAndNotify(
  bookingId: string,
  opts?: { force?: boolean },
): Promise<{ ok: boolean }> {
  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { hotelBooking: true },
  });
  if (!row || row.type !== "hotel" || !row.hotelBooking) {
    return { ok: false };
  }

  const hb = row.hotelBooking;
  if (
    !opts?.force &&
    hb.confirmation_pdf_storage_path &&
    isCurrentHotelConfirmationPdfPath(hb.confirmation_pdf_storage_path)
  ) {
    return { ok: true };
  }

  const pdf = await tryGenerateAndPersistHotelConfirmationPdf(row);
  return { ok: Boolean(pdf?.length) };
}
