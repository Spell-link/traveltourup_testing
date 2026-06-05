import type { StorageVariantConfig } from "@/lib/storage/types";
import { hotelConfirmationPdfStorageSuffix } from "@/lib/hotels/confirmation-pdf.constants";

const ALLOWED = ["application/pdf"] as const;

export const HOTEL_VOUCHERS_BUCKET = "hotel-vouchers" as const;

const HOTEL_VOUCHER_OBJECT_RE =
  /^hotel-vouchers\/[a-z][a-z0-9_-]{9,40}\/confirmation-v\d+\.pdf$/;

function isHotelBookingStorageId(id: string): boolean {
  return id.length >= 10 && id.length <= 42 && /^[a-z][a-z0-9_-]+$/i.test(id);
}

export const hotelVouchersVariant: StorageVariantConfig = {
  id: "hotel-vouchers",
  resourceLabel: "Hotel confirmation PDF",
  bucket: HOTEL_VOUCHERS_BUCKET,
  visibility: "private",
  maxBytes: 2 * 1024 * 1024,
  allowedMimeTypes: ALLOWED,
  writePermission: "bookings:manage",
  upsert: true,
  signedUrlExpirySeconds: 300,
  buildObjectPath(_filename: string, context?: Record<string, string>) {
    const hotelBookingId = context?.hotelBookingId?.trim();
    if (!hotelBookingId || !isHotelBookingStorageId(hotelBookingId)) {
      throw new Error("hotelBookingId is required in context for hotel-vouchers variant");
    }
    return `hotel-vouchers/${hotelBookingId}/${hotelConfirmationPdfStorageSuffix()}`;
  },
  isValidStoragePath(path: string) {
    if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
      return false;
    }
    return HOTEL_VOUCHER_OBJECT_RE.test(path);
  },
  parsePathFromUrl(url: string) {
    if (!url) return null;
    const marker = `/storage/v1/object/sign/${HOTEL_VOUCHERS_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const raw = url.slice(idx + marker.length).split(/[?#]/)[0] ?? "";
    let path: string;
    try {
      path = decodeURIComponent(raw);
    } catch {
      return null;
    }
    return hotelVouchersVariant.isValidStoragePath(path) ? path : null;
  },
};
