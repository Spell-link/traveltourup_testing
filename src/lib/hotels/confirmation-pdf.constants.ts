/** Client-safe hotel confirmation PDF path helpers (no server-only). */

export const HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION = 6;

export function hotelConfirmationPdfStorageSuffix(): string {
  return `confirmation-v${HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION}.pdf`;
}

export function isCurrentHotelConfirmationPdfPath(path: string | null | undefined): boolean {
  return Boolean(path?.endsWith(hotelConfirmationPdfStorageSuffix()));
}

export function hotelConfirmationDownloadFilename(bookingRefNo: string): string {
  const safe = bookingRefNo.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `TravelTourUp-Hotel-Confirmation-${safe}.pdf`;
}

export function hotelConfirmationPdfEmailAttachment(bookingRefNo: string, pdfBuffer: Buffer): {
  filename: string;
  content: Buffer;
  contentType: string;
} {
  return {
    filename: hotelConfirmationDownloadFilename(bookingRefNo),
    content: pdfBuffer,
    contentType: "application/pdf",
  };
}
