import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function majorToStripeCents(amountMajor: string, currency: string): number {
  const n = Number.parseFloat(amountMajor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid charge amount.");
  }
  const zeroDecimal = new Set(["jpy", "krw", "vnd"]);
  if (zeroDecimal.has(currency.toLowerCase())) {
    return Math.round(n);
  }
  return Math.round(n * 100);
}

export function stripeCentsToMajor(cents: number, currency: string): string {
  const zeroDecimal = new Set(["jpy", "krw", "vnd"]);
  if (zeroDecimal.has(currency.toLowerCase())) {
    return String(cents);
  }
  return (cents / 100).toFixed(2);
}
