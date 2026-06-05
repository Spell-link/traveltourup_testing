import type { StorageVariantId } from "@/lib/storage/types";
import { blogImagesVariant } from "@/lib/storage/variants/blog-images.variant";
import { flightTicketsVariant } from "@/lib/storage/variants/flight-tickets.variant";
import { hotelVouchersVariant } from "@/lib/storage/variants/hotel-vouchers.variant";
import { userAvatarVariant } from "@/lib/storage/variants/user-avatar.variant";

const CLIENT_REGISTRY: Record<StorageVariantId, { bucket: string; resourceLabel: string; parsePathFromUrl: (url: string) => string | null }> = {
  "blog-images": blogImagesVariant,
  "user-avatar": userAvatarVariant,
  "flight-tickets": flightTicketsVariant,
  "hotel-vouchers": hotelVouchersVariant,
};

export function parseStoragePathFromUrl(
  url: string,
  variantId: StorageVariantId,
): string | null {
  return CLIENT_REGISTRY[variantId]?.parsePathFromUrl(url) ?? null;
}

export function getStorageVariantUiDefaults(variantId: StorageVariantId): {
  bucket: string;
  resourceLabel: string;
} {
  const entry = CLIENT_REGISTRY[variantId];
  return { bucket: entry.bucket, resourceLabel: entry.resourceLabel };
}
