import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import {
  mapPhoneAuthError,
  maskPhone,
  PHONE_VERIFY_METADATA,
} from "@/lib/auth/phone-verification.core";
import { syncVerifiedPhoneToProfile } from "@/lib/auth/phone-verification";

const OTP_SEND_LIMIT = 5;
const OTP_VERIFY_LIMIT = 10;

type SendPhoneOtpOptions = {
  /** When true, only resend an existing phone_change OTP (do not call updateUser). */
  resend?: boolean;
};

function logPhoneOtpFailure(context: string, phone: string, message: string) {
  if (process.env.NODE_ENV === "production") return;
  console.error(`[phone-otp] ${context} failed for ${maskPhone(phone)}: ${message}`);
}

/**
 * Send SMS OTP via Supabase Auth → Twilio.
 * Initial send: updateUser({ phone }) — Supabase delivers the code automatically.
 * Resend: resend({ type: "phone_change" }) only.
 */
export async function sendPhoneOtpWithClient(
  supabase: SupabaseClient,
  phone: string,
  clientIp: string,
  options?: SendPhoneOtpOptions,
): Promise<{ error?: string; masked?: string }> {
  const rl = rateLimitByKey(`phone-otp-send:${clientIp}:${phone}`, OTP_SEND_LIMIT);
  if (!rl.ok) {
    return { error: "Too many code requests. Please wait a minute and try again." };
  }

  if (options?.resend) {
    const { error: resendError } = await supabase.auth.resend({
      type: "phone_change",
      phone,
    });

    if (resendError) {
      logPhoneOtpFailure("resend", phone, resendError.message);
      return { error: mapPhoneAuthError(resendError.message) };
    }

    return { masked: maskPhone(phone) };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    phone,
    data: {
      [PHONE_VERIFY_METADATA.required]: true,
      [PHONE_VERIFY_METADATA.verified]: false,
    },
  });

  if (updateError) {
    logPhoneOtpFailure("updateUser", phone, updateError.message);
    return { error: mapPhoneAuthError(updateError.message) };
  }

  return { masked: maskPhone(phone) };
}

export async function verifyPhoneOtpWithClient(
  supabase: SupabaseClient,
  input: { phone: string; token: string; userId: string; clientIp: string },
): Promise<{ error?: string }> {
  const rl = rateLimitByKey(`phone-otp-verify:${input.clientIp}:${input.phone}`, OTP_VERIFY_LIMIT);
  if (!rl.ok) {
    return { error: "Too many attempts. Please wait and try again." };
  }

  let verifyError = (
    await supabase.auth.verifyOtp({
      phone: input.phone,
      token: input.token,
      type: "phone_change",
    })
  ).error;

  if (verifyError) {
    verifyError = (
      await supabase.auth.verifyOtp({
        phone: input.phone,
        token: input.token,
        type: "sms",
      })
    ).error;
  }

  if (verifyError) {
    return { error: mapPhoneAuthError(verifyError.message) };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      [PHONE_VERIFY_METADATA.required]: false,
      [PHONE_VERIFY_METADATA.verified]: true,
    },
  });

  if (metaError) {
    return { error: mapPhoneAuthError(metaError.message) };
  }

  await syncVerifiedPhoneToProfile(input.userId, input.phone);
  return {};
}

export { clientIpFromHeaders };
