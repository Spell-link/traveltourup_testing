import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

/** E.164: leading + followed by 7–15 digits (no spaces). */
export const E164_PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * Normalize and validate a phone for Duffel / airline APIs.
 * Duffel rejects numbers that are not valid per libphonenumber (not just E.164-shaped).
 */
export function formatDuffelPhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed?.isValid()) return null;

  return parsed.format("E.164");
}

export function isE164Phone(value: string): boolean {
  return formatDuffelPhone(value) != null;
}

/** @deprecated Prefer `formatDuffelPhone` — kept for call sites that expect this name. */
export function normalizeE164Phone(input: string): string | null {
  return formatDuffelPhone(input);
}

export const e164PhoneSchema = z
  .string()
  .min(1)
  .max(32)
  .refine((v) => formatDuffelPhone(v) != null, {
    message: "Phone number must be a valid international number in E.164 format (e.g. +442080160509).",
  })
  .transform((v) => formatDuffelPhone(v)!);
