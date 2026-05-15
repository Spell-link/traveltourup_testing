import { randomUUID } from "node:crypto";

/**
 * Reads a stable correlation id from the inbound request, or mints a fresh
 * one. Use the same value in: structured logs, webhook handlers, and Duffel
 * outbound headers (when supported) so a single saga is grep-able end-to-end.
 *
 * Header name follows the common `X-Request-Id` convention; we also accept
 * Vercel's `X-Vercel-Id` so platform-injected ids survive.
 */
export const REQUEST_ID_HEADER = "x-request-id";

export function getRequestId(getter: (name: string) => string | null): string {
  const fromInbound = (getter(REQUEST_ID_HEADER) ?? getter("x-vercel-id"))?.trim();
  if (fromInbound) return fromInbound.slice(0, 64);
  return randomUUID();
}
