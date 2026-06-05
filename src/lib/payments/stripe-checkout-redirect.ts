"use client";

import type { StaysCheckoutPrepareResponse } from "@/lib/validations/stays.schema";

export const STAYS_CHECKOUT_SESSION_KEY = "ttu_stays_stripe_checkout";

const STRIPE_REDIRECT_QUERY_KEYS = [
  "payment_intent",
  "payment_intent_client_secret",
  "redirect_status",
] as const;

export type StaysCheckoutSession = {
  guest: {
    email: string;
    phone_number: string;
    guests: { given_name: string; family_name: string; born_on?: string }[];
    accommodation_special_requests?: string;
    loyalty_programme_account_number?: string;
  };
  prepareResult: StaysCheckoutPrepareResponse;
  quoteId: string;
  bookingIdempotencyKey: string;
};

export function buildStripePaymentReturnUrl(quoteId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  for (const key of STRIPE_REDIRECT_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  url.searchParams.set("quote_id", quoteId);
  return url.toString();
}

export function readStripeRedirectParams(): {
  redirectStatus: string | null;
  paymentIntentClientSecret: string | null;
} {
  if (typeof window === "undefined") {
    return { redirectStatus: null, paymentIntentClientSecret: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    redirectStatus: params.get("redirect_status"),
    paymentIntentClientSecret: params.get("payment_intent_client_secret"),
  };
}

export function stripStripeRedirectParamsFromPath(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  for (const key of STRIPE_REDIRECT_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function saveStaysCheckoutSession(session: StaysCheckoutSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STAYS_CHECKOUT_SESSION_KEY, JSON.stringify(session));
}

export function loadStaysCheckoutSession(): StaysCheckoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STAYS_CHECKOUT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaysCheckoutSession;
  } catch {
    return null;
  }
}

export function clearStaysCheckoutSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STAYS_CHECKOUT_SESSION_KEY);
}
