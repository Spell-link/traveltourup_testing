import "server-only";

import { AppError } from "@/lib/api/errors";
import { DuffelApiError } from "@/lib/duffel/errors";
import type { StaysQuoteDto } from "@/lib/api/stays-dto";
import { runStaysCreateQuote, runStaysGetQuote } from "@/lib/services/stays/stays-quote.service";

const QUOTE_STALE_BUFFER_MS = 90_000;

export function isStaysQuoteExpired(
  expiresAt: string | null | undefined,
  bufferMs: number = QUOTE_STALE_BUFFER_MS,
): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return false;
  return exp <= Date.now() + bufferMs;
}

export function isDuffelStaysRateUnavailableError(error: unknown): boolean {
  if (!(error instanceof DuffelApiError)) return false;
  if (error.hasDuffelErrorCode("rate_unavailable")) return true;
  if (error.status === 422) {
    return error.duffelErrors.some(
      (e) =>
        e.code === "rate_unavailable" ||
        (typeof e.message === "string" && /no longer available|has expired/i.test(e.message)),
    );
  }
  return false;
}

/**
 * Returns a quote that is still valid for checkout/book, refreshing from `rateId` when needed.
 */
export async function resolveFreshStaysQuote(input: {
  quoteId: string;
  rateId?: string | null;
}): Promise<StaysQuoteDto> {
  let quote = await runStaysGetQuote(input.quoteId);

  if (!isStaysQuoteExpired(quote.expires_at)) {
    return quote;
  }

  const rateId = input.rateId?.trim() || quote.rate_id?.trim();
  if (!rateId) {
    throw new AppError(
      409,
      "This price has expired. Go back to the hotel page and select your room again.",
      "QUOTE_EXPIRED",
    );
  }

  quote = await runStaysCreateQuote(rateId);
  return quote;
}
