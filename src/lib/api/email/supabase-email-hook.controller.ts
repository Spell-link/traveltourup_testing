import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { buildSupabaseVerifyUrl, sendEmail, supabaseFlowTypeFromAction } from "@/lib/email";
import { supabaseSendEmailHookSchema } from "@/lib/validations/email.schema";

function normalizeWebhookSecret(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("v1,")) {
    return t.slice(3).trim();
  }
  return t;
}

function headersForWebhook(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function firstNameFromMetadata(meta: Record<string, unknown> | undefined): string | undefined {
  const v = meta?.first_name;
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * Supabase Auth → Send Email Hook. Verifies Standard Webhooks signature, then sends via SMTP.
 * Configure in Supabase Dashboard → Authentication → Hooks → Send Email → URL of this route.
 */
export async function handleSupabaseEmailHook(req: NextRequest): Promise<Response> {
  const secretRaw = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  if (!secretRaw) {
    console.error("[supabase-email-hook] SEND_EMAIL_HOOK_SECRET is not set");
    return NextResponse.json(
      { success: false as const, code: "NOT_CONFIGURED", message: "Hook secret not configured." },
      { status: 503 },
    );
  }

  const rawBody = await req.text();

  let parsedPayload: unknown;
  try {
    const wh = new Webhook(normalizeWebhookSecret(secretRaw));
    parsedPayload = wh.verify(rawBody, headersForWebhook(req));
  } catch (e) {
    console.error("[supabase-email-hook] verification failed:", e);
    return NextResponse.json(
      { success: false as const, code: "INVALID_SIGNATURE", message: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const parsed = supabaseSendEmailHookSchema.safeParse(parsedPayload);
  if (!parsed.success) {
    console.error("[supabase-email-hook] payload validation failed:", parsed.error.flatten());
    return NextResponse.json(
      { success: false as const, code: "INVALID_PAYLOAD", message: "Invalid hook payload." },
      { status: 400 },
    );
  }

  const { user, email_data } = parsed.data;
  const email = user.email;
  if (!email) {
    return NextResponse.json(
      { success: false as const, code: "MISSING_EMAIL", message: "User email missing." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    console.error("[supabase-email-hook] NEXT_PUBLIC_SUPABASE_URL is not set");
    return NextResponse.json(
      { success: false as const, code: "SERVER_MISCONFIG", message: "Supabase URL not configured." },
      { status: 503 },
    );
  }

  const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const redirectTo =
    email_data.redirect_to?.trim() ||
    (appBase ? `${appBase}/auth/callback` : `${email_data.site_url?.replace(/\/$/, "") ?? ""}/auth/callback`);

  const token = email_data.token;
  const action = email_data.email_action_type;
  const flowType = supabaseFlowTypeFromAction(action);
  const verifyUrl = buildSupabaseVerifyUrl({
    supabaseUrl,
    token,
    flowType,
    redirectTo,
  });

  const firstName = firstNameFromMetadata(user.user_metadata);

  try {
    if (action === "recovery") {
      await sendEmail({
        type: "password_reset",
        to: email,
        props: {
          resetUrl: verifyUrl,
          firstName,
        },
      });
    } else if (action === "signup" || action === "invite") {
      const displayCode = token.length <= 12 ? token : "Use the button below";
      await sendEmail({
        type: "otp_verification",
        to: email,
        props: {
          code: displayCode,
          purpose: "Confirm your email",
          actionUrl: verifyUrl,
          expiresInMinutes: 60,
        },
      });
    } else if (action === "magiclink" || action === "email_change" || action === "reauthentication") {
      const purpose =
        action === "email_change"
          ? "Confirm your new email"
          : action === "reauthentication"
            ? "Verify it’s you"
            : "Your secure sign-in link";
      const displayCode = token.length <= 12 ? token : "Use the button below";
      await sendEmail({
        type: "otp_verification",
        to: email,
        props: {
          code: displayCode,
          purpose,
          actionUrl: verifyUrl,
          expiresInMinutes: 15,
        },
      });
    } else {
      const displayCode = token.length <= 12 ? token : "Use the button below";
      await sendEmail({
        type: "otp_verification",
        to: email,
        props: {
          code: displayCode,
          purpose: "Verify your account",
          actionUrl: verifyUrl,
          expiresInMinutes: 60,
        },
      });
    }

    return NextResponse.json({ success: true as const });
  } catch (err) {
    console.error("[supabase-email-hook] send failed:", err);
    return NextResponse.json(
      { success: false as const, code: "SEND_FAILED", message: "Failed to send email." },
      { status: 502 },
    );
  }
}
