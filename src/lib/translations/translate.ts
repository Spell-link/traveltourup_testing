import "server-only";

import type { AppLocale } from "@/i18n/routing";
import { getCachedTranslation, setCachedTranslation, translationCacheKey } from "./cache";
import { resolveLibreTranslateBaseUrls, resolveLibreTranslateEndpoint } from "./translate-config";
import { splitHtmlIntoChunks } from "./translate-html-chunks";

const DEFAULT_TEXT_TIMEOUT_MS = 45_000;
const DEFAULT_HTML_TIMEOUT_MS = 120_000;
const STAGING_TRANSLATION_CONCURRENCY = 1;
const MANAGED_TRANSLATION_CONCURRENCY = 2;
const TRANSLATION_RETRIES = 2;

export class TranslationProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationProviderError";
  }
}

function libreTranslateApiKey(): string | undefined {
  const raw = process.env.LIBRE_TRANSLATE_API_KEY?.trim();
  return raw || undefined;
}

function translationEnv() {
  return {
    url: process.env.LIBRE_TRANSLATE_URL,
    apiKey: libreTranslateApiKey(),
    stagingUrl: process.env.LIBRE_TRANSLATE_STAGING_URL,
  };
}

function libreTranslateEndpoint() {
  return resolveLibreTranslateEndpoint(translationEnv());
}

function libreTranslateBaseUrls(): string[] {
  return resolveLibreTranslateBaseUrls(translationEnv());
}

function providerLocale(locale: AppLocale | string): string {
  return locale;
}

function translationFormat(text: string): "html" | "text" {
  return /<[a-z][\s\S]*>/i.test(text) ? "html" : "text";
}

function requestTimeoutMs(text: string): number {
  const raw = process.env.TRANSLATION_REQUEST_TIMEOUT_MS?.trim();
  const configured = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(configured) && configured > 0) return configured;
  return translationFormat(text) === "html" ? DEFAULT_HTML_TIMEOUT_MS : DEFAULT_TEXT_TIMEOUT_MS;
}

function translationConcurrency(): number {
  return libreTranslateEndpoint().usesStagingMirror
    ? STAGING_TRANSLATION_CONCURRENCY
    : MANAGED_TRANSLATION_CONCURRENCY;
}

function parseProviderError(detail: string, status: number): string {
  try {
    const parsed = JSON.parse(detail) as { error?: string };
    const message = parsed.error?.trim();
    if (message?.includes("portal.libretranslate.com")) {
      return "LibreTranslate requires an API key for the managed host. Leave LIBRE_TRANSLATE_API_KEY empty to use the staging mirror, or set LIBRE_TRANSLATE_URL to your self-hosted instance.";
    }
    if (message) return `LibreTranslate request failed (${status}): ${message}`;
  } catch {
    // Fall through to raw detail.
  }
  return detail
    ? `LibreTranslate request failed (${status}): ${detail}`
    : `LibreTranslate request failed (${status})`;
}

function isRetryableProviderError(error: unknown): boolean {
  if (!(error instanceof TranslationProviderError)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("request failed (5") ||
    message.includes("request failed (502)") ||
    message.includes("request failed (503)") ||
    message.includes("request failed (504)") ||
    message.includes("request failed.")
  );
}

async function callLibreTranslateOnBaseUrl(
  baseUrl: string,
  text: string,
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, string> = {
      q: text,
      source: providerLocale(sourceLocale),
      target: providerLocale(targetLocale),
      format: translationFormat(text),
    };
    const apiKey = libreTranslateApiKey();
    if (apiKey) body.api_key = apiKey;

    const res = await fetch(`${baseUrl}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new TranslationProviderError(parseProviderError(detail, res.status));
    }

    const json = (await res.json()) as { translatedText?: string };
    if (!json.translatedText?.trim()) {
      throw new TranslationProviderError("LibreTranslate returned an empty translation.");
    }
    return json.translatedText;
  } catch (error) {
    if (error instanceof TranslationProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TranslationProviderError("LibreTranslate request timed out.");
    }
    throw new TranslationProviderError("LibreTranslate request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

async function callLibreTranslate(
  text: string,
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
): Promise<string> {
  const timeoutMs = requestTimeoutMs(text);
  const baseUrls = libreTranslateBaseUrls();
  let lastError: TranslationProviderError | null = null;

  for (const baseUrl of baseUrls) {
    for (let attempt = 0; attempt <= TRANSLATION_RETRIES; attempt += 1) {
      try {
        return await callLibreTranslateOnBaseUrl(
          baseUrl,
          text,
          sourceLocale,
          targetLocale,
          timeoutMs,
        );
      } catch (error) {
        if (!(error instanceof TranslationProviderError)) throw error;
        lastError = error;
        if (!isRetryableProviderError(error) || attempt >= TRANSLATION_RETRIES) break;
      }
    }
  }

  throw lastError ?? new TranslationProviderError("LibreTranslate request failed.");
}

async function translateHtmlContent(
  html: string,
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
): Promise<string> {
  const chunks = splitHtmlIntoChunks(html);
  if (chunks.length <= 1) {
    return callLibreTranslate(html, sourceLocale, targetLocale);
  }

  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    translatedChunks.push(await callLibreTranslate(chunk, sourceLocale, targetLocale));
  }
  return translatedChunks.join("");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function translateText(
  text: string,
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (sourceLocale === targetLocale) return text;

  const cacheKey = translationCacheKey(sourceLocale, targetLocale, trimmed);
  const cached = getCachedTranslation(cacheKey);
  if (cached !== null) return cached;

  const translated =
    translationFormat(trimmed) === "html"
      ? await translateHtmlContent(trimmed, sourceLocale, targetLocale)
      : await callLibreTranslate(trimmed, sourceLocale, targetLocale);
  setCachedTranslation(cacheKey, translated);
  return translated;
}

export async function translateTexts(
  texts: string[],
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
): Promise<string[]> {
  if (sourceLocale === targetLocale) return [...texts];
  return mapWithConcurrency(texts, translationConcurrency(), (text) =>
    translateText(text, sourceLocale, targetLocale),
  );
}

export async function translateFieldMap(
  fields: Record<string, string>,
  sourceLocale: AppLocale | string,
  targetLocale: AppLocale | string,
): Promise<Record<string, string>> {
  if (sourceLocale === targetLocale) return { ...fields };

  const result: Record<string, string> = {};
  const content = fields.content;
  const otherEntries = Object.entries(fields).filter(([key]) => key !== "content");

  const translatedOther = await translateTexts(
    otherEntries.map(([, value]) => value),
    sourceLocale,
    targetLocale,
  );
  for (const [index, [key]] of otherEntries.entries()) {
    result[key] = translatedOther[index] ?? "";
  }

  if (content !== undefined) {
    result.content = await translateText(content, sourceLocale, targetLocale);
  }

  return result;
}
