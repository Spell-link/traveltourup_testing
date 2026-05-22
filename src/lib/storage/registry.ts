import { z } from "zod";
import type { StorageVariantConfig, StorageVariantId } from "@/lib/storage/types";
import { blogImagesVariant } from "@/lib/storage/variants/blog-images.variant";
import { flightTicketsVariant } from "@/lib/storage/variants/flight-tickets.variant";
import { userAvatarVariant } from "@/lib/storage/variants/user-avatar.variant";

const REGISTRY: Record<StorageVariantId, StorageVariantConfig> = {
  "blog-images": blogImagesVariant,
  "user-avatar": userAvatarVariant,
  "flight-tickets": flightTicketsVariant,
};

export const storageVariantIdSchema = z.enum(
  Object.keys(REGISTRY) as [StorageVariantId, ...StorageVariantId[]],
);

export function getStorageVariant(id: string): StorageVariantConfig | undefined {
  return REGISTRY[id as StorageVariantId];
}

export function requireStorageVariant(id: string): StorageVariantConfig {
  const v = getStorageVariant(id);
  if (!v) {
    throw new Error(`Unknown storage variant: ${id}`);
  }
  return v;
}

/** All registered ids (for docs / admin tooling). */
export function listStorageVariantIds(): StorageVariantId[] {
  return Object.keys(REGISTRY) as StorageVariantId[];
}
