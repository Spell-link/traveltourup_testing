import type { StorageVariantConfig } from "@/lib/storage/types";
import { flightItineraryPdfStorageSuffix } from "@/lib/flights/itinerary-pdf.constants";

const ALLOWED = ["application/pdf"] as const;

/** Private bucket for generated flight itinerary PDFs (not public URLs). */
export const FLIGHT_TICKETS_BUCKET = "flight-tickets" as const;

/** `flight-tickets/{id}/itinerary-v{N}.pdf` — versioned path busts stale layout caches. */
const FLIGHT_TICKET_OBJECT_RE =
  /^flight-tickets\/[a-z][a-z0-9_-]{9,40}\/itinerary-v\d+\.pdf$/;

function isFlightBookingStorageId(id: string): boolean {
  return id.length >= 10 && id.length <= 42 && /^[a-z][a-z0-9_-]+$/i.test(id);
}

export const flightTicketsVariant: StorageVariantConfig = {
  id: "flight-tickets",
  resourceLabel: "Flight itinerary PDF",
  bucket: FLIGHT_TICKETS_BUCKET,
  visibility: "private",
  maxBytes: 2 * 1024 * 1024,
  allowedMimeTypes: ALLOWED,
  writePermission: "bookings:manage",
  upsert: true,
  signedUrlExpirySeconds: 300,
  buildObjectPath(_filename: string, context?: Record<string, string>) {
    const flightBookingId = context?.flightBookingId?.trim();
    if (!flightBookingId || !isFlightBookingStorageId(flightBookingId)) {
      throw new Error("flightBookingId is required in context for flight-tickets variant");
    }
    return `flight-tickets/${flightBookingId}/${flightItineraryPdfStorageSuffix()}`;
  },
  isValidStoragePath(path: string) {
    if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
      return false;
    }
    return FLIGHT_TICKET_OBJECT_RE.test(path);
  },
  parsePathFromUrl(url: string) {
    if (!url) return null;
    const marker = `/storage/v1/object/sign/${FLIGHT_TICKETS_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const raw = url.slice(idx + marker.length).split(/[?#]/)[0] ?? "";
    let path: string;
    try {
      path = decodeURIComponent(raw);
    } catch {
      return null;
    }
    return flightTicketsVariant.isValidStoragePath(path) ? path : null;
  },
};
