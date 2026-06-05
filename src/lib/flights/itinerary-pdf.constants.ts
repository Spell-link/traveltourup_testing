/**
 * Client-safe itinerary PDF path helpers (no server-only).
 * Used by storage variants and server PDF builders — keep free of Node/server imports.
 */

/** Bump when PDF layout changes — invalidates cached `itinerary-v{N}.pdf` paths. */
export const FLIGHT_ITINERARY_PDF_LAYOUT_VERSION = 8;

export function flightItineraryPdfStorageSuffix(): string {
  return `itinerary-v${FLIGHT_ITINERARY_PDF_LAYOUT_VERSION}.pdf`;
}

export function isCurrentItineraryPdfPath(path: string | null | undefined): boolean {
  return Boolean(path?.endsWith(flightItineraryPdfStorageSuffix()));
}

/** Same filename as GET /api/v1/bookings/:id/itinerary download and profile export link. */
export function flightItineraryDownloadFilename(bookingRefNo: string): string {
  const safe = bookingRefNo.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `TravelTourUp-Flight-Itinerary-${safe}.pdf`;
}

/** Nodemailer attachment shape for the itinerary PDF (confirmation + follow-up emails). */
export function flightItineraryPdfEmailAttachment(bookingRefNo: string, pdfBuffer: Buffer): {
  filename: string;
  content: Buffer;
  contentType: string;
} {
  return {
    filename: flightItineraryDownloadFilename(bookingRefNo),
    content: pdfBuffer,
    contentType: "application/pdf",
  };
}
