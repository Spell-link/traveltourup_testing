import type { PermissionId } from "@/lib/authz/registry";

/**
 * Declarative config for a Supabase Storage variant (public or private bucket).
 * Add a new variant file under `variants/`, register it in `registry.ts`,
 * and every API route + client component picks it up automatically.
 */
export type StorageVariantConfig = {
  /** Stable id sent from client (FormData / JSON) — URL-safe slug. */
  id: StorageVariantId;
  /** Human label for UI (e.g. "Blog images", "User avatar"). */
  resourceLabel: string;
  /** Supabase Storage bucket id (must exist + RLS/policy in Supabase). */
  bucket: string;
  /** Public buckets return a publicUrl; private buckets return a signedUrl. */
  visibility: "public" | "private";
  maxBytes: number;
  allowedMimeTypes: readonly string[];
  /** Server-only: required permission for upload + delete. Ignored when `selfService` is true. */
  writePermission: PermissionId;
  /** When true, only authentication is required (no permission check). Use for user-owned resources like avatars. */
  selfService?: boolean;
  /** When true the upload overwrites existing objects at the same path. */
  upsert: boolean;
  /** Lifetime of signed download URLs (private variants only). */
  signedUrlExpirySeconds?: number;
  /** Build the object key. `context` carries caller-provided metadata (e.g. userId). */
  buildObjectPath: (filename: string, context?: Record<string, string>) => string;
  isValidStoragePath: (path: string) => boolean;
  /** Derive storage path from a URL for this bucket, or null. */
  parsePathFromUrl: (url: string) => string | null;
};

/** Extend this tuple when adding variants; keep `registry` and Zod in sync. */
export const STORAGE_VARIANT_IDS = ["blog-images", "user-avatar", "flight-tickets", "hotel-vouchers"] as const;

export type StorageVariantId = (typeof STORAGE_VARIANT_IDS)[number];
