"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfileForAuthUser } from "@/lib/authz/profile";
import {
  markPhoneVerificationRequired,
  maskPhone,
  PHONE_VERIFY_METADATA,
} from "@/lib/auth/phone-verification";
import { mapPhoneAuthError } from "@/lib/auth/phone-verification.core";
import { sendPhoneOtpWithClient, verifyPhoneOtpWithClient } from "@/lib/auth/phone-otp.service";
import { clientIpFromHeaders } from "@/lib/api/rate-limit-ip";
import {
  forgotPasswordSchema,
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  signInFormSchema,
  signUpFormSchema,
} from "@/lib/validations/auth.schema";
import { safeInternalPath } from "@/lib/auth/redirect";
import { defaultLocale } from "@/i18n/routing";
import { firstNameFromUserMetadata, lastNameFromUserMetadata } from "@/lib/auth/user-metadata";

/** Auth emails (confirm, reset, magic link) are sent through SMTP when the Supabase Send Email Hook targets `POST /api/auth/supabase-email-hook`. */

export type AuthActionState = {
  error?: string;
  success?: string;
  step?: "otp";
  phone?: string;
} | null;

async function clientIp(): Promise<string> {
  const h = await headers();
  return clientIpFromHeaders((name) => h.get(name));
}

async function syncProfileFromAuthUser(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}) {
  await ensureUserProfileForAuthUser({
    id: user.id,
    first_name: firstNameFromUserMetadata(user.user_metadata),
    last_name: lastNameFromUserMetadata(user.user_metadata),
  });
}

async function requireSessionUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user.id;
}

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }

  const next = safeInternalPath(String(formData.get("next") ?? ""));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await syncProfileFromAuthUser({
      id: data.user.id,
      user_metadata: data.user.user_metadata as Record<string, unknown> | undefined,
    });
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/** Step 1: email/password account + mark phone verification required. Returns OTP step. */
export async function signUpStartAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  /** Account already created (OTP step) — update phone only, do not sign up again. */
  if (sessionUser) {
    const sendResult = await sendPhoneOtpInternal(parsed.data.phone);
    if (sendResult.error) {
      return { error: sendResult.error, step: "otp", phone: maskPhone(parsed.data.phone) };
    }
    revalidatePath("/", "layout");
    return {
      step: "otp",
      phone: maskPhone(parsed.data.phone),
      success: `We sent a verification code to ${maskPhone(parsed.data.phone)}.`,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        [PHONE_VERIFY_METADATA.required]: true,
        [PHONE_VERIFY_METADATA.verified]: false,
      },
    },
  });

  if (error) {
    return { error: mapPhoneAuthError(error.message) };
  }

  if (!data.user) {
    return { error: "Signup failed. Please try again." };
  }

  if (!data.session) {
    return {
      error:
        "Account created but session missing. Disable email confirmation in Supabase (Authentication → Providers → Email) and try again.",
    };
  }

  await ensureUserProfileForAuthUser({
    id: data.user.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
  });
  await markPhoneVerificationRequired(data.user.id);

  const sendResult = await sendPhoneOtpInternal(parsed.data.phone);
  if (sendResult.error) {
    return { error: sendResult.error, step: "otp", phone: maskPhone(parsed.data.phone) };
  }

  revalidatePath("/", "layout");
  return {
    step: "otp",
    phone: maskPhone(parsed.data.phone),
    success: `We sent a verification code to ${maskPhone(parsed.data.phone)}.`,
  };
}

async function sendPhoneOtpInternal(
  phone: string,
  options?: { resend?: boolean },
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const ip = await clientIp();
  const result = await sendPhoneOtpWithClient(supabase, phone, ip, options);
  return { error: result.error };
}

export async function sendPhoneOtpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = phoneOtpSendSchema.safeParse({
    phone: formData.get("phone"),
    resend: formData.get("resend") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid phone number." };
  }

  try {
    await requireSessionUserId();
  } catch {
    return { error: "Sign in to continue phone verification." };
  }

  const result = await sendPhoneOtpInternal(parsed.data.phone, {
    resend: parsed.data.resend === true,
  });
  if (result.error) {
    return { error: result.error };
  }

  return {
    success: `Verification code sent to ${maskPhone(parsed.data.phone)}.`,
    phone: maskPhone(parsed.data.phone),
    step: "otp",
  };
}

export async function verifyPhoneOtpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = phoneOtpVerifySchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: beforeUser },
  } = await supabase.auth.getUser();
  if (!beforeUser) {
    return { error: "Sign in to continue phone verification." };
  }

  const ip = await clientIp();
  const result = await verifyPhoneOtpWithClient(supabase, {
    phone: parsed.data.phone,
    token: parsed.data.token,
    userId: beforeUser.id,
    clientIp: ip,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  redirect(safeInternalPath(parsed.data.next ?? "/"));
}

/** @deprecated Use signUpStartAction — kept for compatibility during migration. */
export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  return signUpStartAction(_prev, formData);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`/${defaultLocale}/login`);
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) {
    return { error: "App URL is not configured. Set NEXT_PUBLIC_APP_URL in .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin.replace(/\/$/, "")}/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If an account exists for that email, you will receive a reset link shortly.",
  };
}
