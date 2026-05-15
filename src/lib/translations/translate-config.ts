const OFFICIAL_MANAGED_HOST = "libretranslate.com";

/** Public mirror from LibreTranslate docs; no API key for low-volume staging. */
export const DEFAULT_STAGING_LIBRE_TRANSLATE_URL = "https://translate.fedilab.app";

/** Additional mirrors to try when staging translation fails or times out. */
export const STAGING_LIBRE_TRANSLATE_FALLBACKS = [
  DEFAULT_STAGING_LIBRE_TRANSLATE_URL,
] as const;

export type LibreTranslateEndpoint = {
  baseUrl: string;
  usesStagingMirror: boolean;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function isOfficialManagedLibreTranslateUrl(url: string): boolean {
  try {
    const host = new URL(normalizeBaseUrl(url)).hostname.toLowerCase();
    return host === OFFICIAL_MANAGED_HOST || host.endsWith(`.${OFFICIAL_MANAGED_HOST}`);
  } catch {
    return false;
  }
}

export function resolveLibreTranslateEndpoint(env: {
  url?: string;
  apiKey?: string;
  stagingUrl?: string;
}): LibreTranslateEndpoint {
  const apiKey = env.apiKey?.trim() ?? "";
  const configuredUrl = env.url?.trim();
  const stagingUrl = normalizeBaseUrl(
    env.stagingUrl?.trim() || DEFAULT_STAGING_LIBRE_TRANSLATE_URL,
  );

  if (configuredUrl) {
    const normalized = normalizeBaseUrl(configuredUrl);
    if (!apiKey && isOfficialManagedLibreTranslateUrl(normalized)) {
      return { baseUrl: stagingUrl, usesStagingMirror: true };
    }
    return { baseUrl: normalized, usesStagingMirror: false };
  }

  if (apiKey) {
    return { baseUrl: `https://${OFFICIAL_MANAGED_HOST}`, usesStagingMirror: false };
  }

  return { baseUrl: stagingUrl, usesStagingMirror: true };
}

export function resolveLibreTranslateBaseUrls(env: {
  url?: string;
  apiKey?: string;
  stagingUrl?: string;
}): string[] {
  const endpoint = resolveLibreTranslateEndpoint(env);
  if (!endpoint.usesStagingMirror) {
    return [endpoint.baseUrl];
  }

  const urls = [
    endpoint.baseUrl,
    ...STAGING_LIBRE_TRANSLATE_FALLBACKS,
  ].map((url) => normalizeBaseUrl(url));

  return [...new Set(urls)];
}
