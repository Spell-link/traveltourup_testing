import "server-only";

import { createHash } from "node:crypto";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

function cacheTtlMs(): number {
  const raw = process.env.TRANSLATION_CACHE_TTL_SECONDS?.trim();
  const seconds = raw ? Number.parseInt(raw, 10) : 86_400;
  if (!Number.isFinite(seconds) || seconds <= 0) return 86_400_000;
  return seconds * 1000;
}

export function translationCacheKey(
  sourceLocale: string,
  targetLocale: string,
  text: string,
): string {
  const digest = createHash("sha256")
    .update(`${sourceLocale}:${targetLocale}:${text.trim()}`)
    .digest("hex");
  return digest;
}

export function getCachedTranslation(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedTranslation(key: string, value: string): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + cacheTtlMs(),
  });
}
