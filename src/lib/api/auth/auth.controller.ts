import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { successResponse } from "@/lib/api/response";
import { ensureUserProfileForAuthUser } from "@/lib/authz/profile";
import { markPhoneVerificationRequired, PHONE_VERIFY_METADATA } from "@/lib/auth/phone-verification";
import { sendPhoneOtpWithClient, verifyPhoneOtpWithClient } from "@/lib/auth/phone-otp.service";
import { clientIpFromHeaders } from "@/lib/api/rate-limit-ip";
import {
  loginSchema,
  signupSchema,
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  refreshTokenSchema,
  forgotPasswordSchema,
} from "@/lib/validations/auth.schema";

/**
 * Stateless Supabase client for auth proxy operations.
 * No cookie persistence — designed for mobile / external API token flows.
 */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function authError(message: string, status = 401) {
  return NextResponse.json(
    { success: false as const, code: "AUTH_ERROR" as const, message },
    { status },
  );
}

// --------------- Login ---------------

export async function handleLogin(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      return authError(error?.message ?? "Invalid credentials");
    }

    const meta = data.user.user_metadata ?? {};
    await ensureUserProfileForAuthUser({
      id: data.user.id,
      first_name: (meta.first_name as string) ?? "",
      last_name: (meta.last_name as string) ?? "",
    });

    return successResponse({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: "bearer",
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// --------------- Signup ---------------
/**
 * Email delivery: configure Supabase Auth “Send Email” hook →
 * `POST /api/auth/supabase-email-hook` so confirmation uses SMTP + React Email.
 * Do not call `sendEmail({ type: "welcome" })` here if the hook already sends signup/confirm
 * mail — that would duplicate messages. Optional marketing welcome can be sent after a
 * confirmed session (e.g. via a job or `POST /api/email/send` with EMAIL_SERVER_SECRET).
 */

export async function handleSignup(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name, phone, redirect_to } = signupSchema.parse(body);

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          [PHONE_VERIFY_METADATA.required]: true,
          [PHONE_VERIFY_METADATA.verified]: false,
        },
        ...(redirect_to && { emailRedirectTo: redirect_to }),
      },
    });

    if (error) return authError(error.message, 400);
    if (!data.user) return authError("Signup failed", 400);

    await ensureUserProfileForAuthUser({ id: data.user.id, first_name, last_name });
    await markPhoneVerificationRequired(data.user.id);

    if (!data.session) {
      return authError(
        "Session missing after signup. Disable email confirmation in Supabase Authentication → Email.",
        400,
      );
    }

    const ip = clientIpFromHeaders((name) => req.headers.get(name));
    const authed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      },
    );

    const otpResult = await sendPhoneOtpWithClient(authed, phone, ip);
    if (otpResult.error) {
      return successResponse(
        {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: "bearer",
          phone_verification_required: true,
          phone_otp_error: otpResult.error,
          user: { id: data.user.id, email: data.user.email },
        },
        201,
      );
    }

    return successResponse(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        token_type: "bearer",
        phone_verification_required: true,
        user: { id: data.user.id, email: data.user.email },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handlePhoneSendOtp(req: NextRequest): Promise<Response> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return authError("Bearer token required", 401);
    }

    const body = await req.json();
    const { phone, resend } = phoneOtpSendSchema.parse(body);
    const token = authHeader.slice(7).trim();

    const authed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );

    const ip = clientIpFromHeaders((name) => req.headers.get(name));
    const result = await sendPhoneOtpWithClient(authed, phone, ip, { resend: resend === true });
    if (result.error) {
      return authError(result.error, 400);
    }

    return successResponse({ message: "Verification code sent.", masked_phone: result.masked });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handlePhoneVerifyOtp(req: NextRequest): Promise<Response> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return authError("Bearer token required", 401);
    }

    const body = await req.json();
    const { phone, token: otpToken } = phoneOtpVerifySchema.parse(body);
    const bearer = authHeader.slice(7).trim();

    const authed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      },
    );

    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) {
      return authError("Invalid session", 401);
    }

    const ip = clientIpFromHeaders((name) => req.headers.get(name));
    const result = await verifyPhoneOtpWithClient(authed, {
      phone,
      token: otpToken,
      userId: user.id,
      clientIp: ip,
    });

    if (result.error) {
      return authError(result.error, 400);
    }

    return successResponse({ message: "Phone verified.", phone_verification_required: false });
  } catch (error) {
    return handleApiError(error);
  }
}

// --------------- Refresh ---------------

export async function handleRefresh(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { refresh_token } = refreshTokenSchema.parse(body);

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return authError(error?.message ?? "Invalid refresh token");
    }

    return successResponse({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: "bearer",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// --------------- Logout ---------------

export async function handleLogout(req: NextRequest): Promise<Response> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return authError("Bearer token required");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return authError("Bearer token is empty");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
    }

    const res = await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });

    if (!res.ok) {
      return authError("Logout failed — token may already be invalid");
    }

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

// --------------- Forgot Password ---------------
/** Password reset emails are sent via the Supabase Send Email Hook (same as signup confirmation). */

export async function handleForgotPassword(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { email, redirect_to } = forgotPasswordSchema.parse(body);

    const supabase = createAnonClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(redirect_to && { redirectTo: redirect_to }),
    });

    if (error) {
      console.error("Password reset error:", error.message);
    }

    return successResponse({
      message: "If the email is registered, a reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
