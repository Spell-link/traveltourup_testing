const EXACT_SKIP_KEYS = new Set([
  "id",
  "slug",
  "url",
  "href",
  "currency",
  "price",
  "amount",
  "iata",
  "icao",
  "timestamp",
  "image",
  "image_url",
  "storage_path",
  "ref_id",
  "booking_ref_no",
  "duffel_order_id",
  "duffel_offer_id",
  "canonical_url",
  "locale",
  "lang",
  "language",
]);

const SUFFIX_SKIP_KEYS = ["_id", "_url", "_path", "_code", "_at", "_key"];

export type TranslateRulesOptions = {
  skipKeys?: Set<string>;
  includePaths?: string[];
  excludePaths?: string[];
};

export function shouldSkipTranslationKey(
  key: string,
  path: string,
  options?: TranslateRulesOptions,
): boolean {
  if (options?.includePaths?.length) {
    const included = options.includePaths.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`),
    );
    if (!included) return true;
  }

  if (options?.excludePaths?.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))) {
    return true;
  }

  const normalized = key.toLowerCase();
  if (options?.skipKeys?.has(normalized)) return true;
  if (EXACT_SKIP_KEYS.has(normalized)) return true;
  if (SUFFIX_SKIP_KEYS.some((suffix) => normalized.endsWith(suffix))) return true;
  return false;
}
