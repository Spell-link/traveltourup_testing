import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { formatDuffelPhone } from "@/lib/validations/phone.schema";

export const PHONE_VERIFY_METADATA = {
  required: "phone_verify_required",
  verified: "phone_verified",
} as const;

export function normalizeSignupPhone(input: string): string | null {
  return formatDuffelPhone(input);
}

export function phoneDisplayParts(e164: string): { phone: string; phone_country_code: string | null } {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) {
    return { phone: e164.replace(/^\+\d{1,3}/, "").trim(), phone_country_code: null };
  }
  return {
    phone: parsed.nationalNumber,
    phone_country_code: `+${parsed.countryCallingCode}`,
  };
}

export function maskPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  const national = parsed.nationalNumber;
  if (national.length <= 4) return e164;
  return `+${parsed.countryCallingCode} •••• ${national.slice(-4)}`;
}

export function isPhoneVerificationPending(user: SupabaseUser): boolean {
  const meta = user.user_metadata ?? {};
  const required = meta[PHONE_VERIFY_METADATA.required] === true;
  const verifiedMeta = meta[PHONE_VERIFY_METADATA.verified] === true;
  const confirmed = Boolean(user.phone_confirmed_at);
  return required && !verifiedMeta && !confirmed;
}

export function mapPhoneAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("63038") || lower.includes("daily messages limit")) {
    return "SMS daily limit reached on your Twilio trial. Try again tomorrow or upgrade your Twilio account.";
  }
  if (lower.includes("phone number") && (lower.includes("already registered") || lower.includes("already exists"))) {
    return "This phone number is already linked to another account.";
  }
  if (lower.includes("user already registered") || (lower.includes("already") && lower.includes("email"))) {
    return "An account with this email already exists. Sign in instead, or use a different email.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "This phone number is already linked to another account.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (lower.includes("invalid") && lower.includes("phone")) {
    return "Enter a valid international mobile number.";
  }
  if (lower.includes("otp") || lower.includes("token")) {
    return "Invalid or expired code. Request a new code and try again.";
  }
  if (lower.includes("error sending") && (lower.includes("sms") || lower.includes("confirmation"))) {
    return "We could not send the SMS. Check Supabase Phone + Twilio settings (Live credentials, Messaging Service with a sender number, and Twilio logs).";
  }
  if (lower.includes("21211") || lower.includes("unverified")) {
    return "Twilio trial accounts can only text verified numbers. Add this number under Twilio → Verified Caller IDs.";
  }
  if (lower.includes("geo") || lower.includes("permission") || lower.includes("21614")) {
    return "SMS to this country is blocked in Twilio. Enable Pakistan under Messaging → Settings → Geo Permissions, or upgrade your Twilio account.";
  }
  if (lower.includes("not a valid phone number") && lower.includes("from")) {
    return "Supabase Twilio config looks wrong: use a Messaging Service SID (MG…) with a sender number, or a Twilio phone number — not a Verify Service SID (VA…).";
  }
  return message;
}
