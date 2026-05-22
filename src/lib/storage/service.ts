import "server-only";

import { AppError } from "@/lib/api/errors";
import { requireStorageVariant } from "@/lib/storage/registry";
import type { StorageVariantConfig } from "@/lib/storage/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

function getPublicUrlForPath(bucket: string, path: string): string | null {
  const supabase = createSupabaseServiceRoleClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new AppError(500, error?.message ?? "Could not create signed URL", "STORAGE_SIGNED_URL");
  }
  return data.signedUrl;
}

export type StorageUploadResult = {
  bucket: string;
  path: string;
  mime: string;
  size: number;
  /** Set for public variants. */
  publicUrl: string | null;
  /** Set for private variants. */
  signedUrl: string | null;
};

export async function uploadToStorage(params: {
  variantId: string;
  buffer: Buffer;
  mime: string;
  size: number;
  originalFilename: string;
  context?: Record<string, string>;
}): Promise<StorageUploadResult> {
  const v = requireStorageVariant(params.variantId);
  if (params.size > v.maxBytes) {
    throw new AppError(
      400,
      `File too large (max ${Math.round(v.maxBytes / (1024 * 1024))} MB)`,
      "STORAGE_FILE_TOO_LARGE",
    );
  }
  if (!v.allowedMimeTypes.includes(params.mime)) {
    throw new AppError(400, "Unsupported file type for this storage variant", "STORAGE_MIME");
  }

  const path = v.buildObjectPath(params.originalFilename, params.context);
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.storage.from(v.bucket).upload(path, params.buffer, {
    contentType: params.mime,
    upsert: v.upsert,
  });

  if (error) {
    throw new AppError(500, error.message, "STORAGE_UPLOAD");
  }

  let publicUrl: string | null = null;
  let signedUrl: string | null = null;

  if (v.visibility === "public") {
    publicUrl = getPublicUrlForPath(v.bucket, path);
    if (!publicUrl) {
      throw new AppError(500, "Could not resolve public URL", "STORAGE_PUBLIC_URL");
    }
  } else {
    signedUrl = await createSignedUrl(v.bucket, path, v.signedUrlExpirySeconds ?? 120);
  }

  return {
    bucket: v.bucket,
    path,
    mime: params.mime,
    size: params.size,
    publicUrl,
    signedUrl,
  };
}

export async function deleteFromStorage(params: {
  variant: StorageVariantConfig;
  path: string;
}): Promise<void> {
  const path = params.path.trim();
  if (!params.variant.isValidStoragePath(path)) {
    throw new AppError(400, "Invalid storage path", "STORAGE_PATH_INVALID");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.storage.from(params.variant.bucket).remove([path]);

  if (error) {
    throw new AppError(500, error.message, "STORAGE_DELETE");
  }
}

export async function downloadObjectFromStorage(params: {
  variant: StorageVariantConfig;
  path: string;
}): Promise<ArrayBuffer> {
  const path = params.path.trim();
  if (!params.variant.isValidStoragePath(path)) {
    throw new AppError(400, "Invalid storage path", "STORAGE_PATH_INVALID");
  }
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from(params.variant.bucket).download(path);
  if (error || !data) {
    throw new AppError(502, error?.message ?? "Could not download file from storage", "STORAGE_DOWNLOAD");
  }
  return data.arrayBuffer();
}

export async function getSignedDownloadUrl(params: {
  variant: StorageVariantConfig;
  path: string;
}): Promise<string> {
  const path = params.path.trim();
  if (!params.variant.isValidStoragePath(path)) {
    throw new AppError(400, "Invalid storage path", "STORAGE_PATH_INVALID");
  }
  return createSignedUrl(
    params.variant.bucket,
    path,
    params.variant.signedUrlExpirySeconds ?? 120,
  );
}
