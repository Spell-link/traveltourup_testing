/**
 * TravelTourUp transactional email pipeline.
 *
 * Refactor notes:
 * - **Content** (React Email templates, subject lines) lives in `emailService` + `templateMapper` + `lib/email/templates/*`.
 * - **Transport** (Hostinger Titan SMTP via Nodemailer, optional `EMAIL_MOCK`) lives in `src/lib/email/sendEmail.ts`.
 * - This file stays the public entry so callers (Supabase hook, `/api/email/send`) keep importing `sendEmail` from `@/lib/email`.
 *
 * Auth emails use the Supabase Send Email Hook → `POST /api/auth/supabase-email-hook`, which calls the same `sendEmail` pipeline.
 */

import "server-only";

import { sendEmail as deliverEmail } from "@/lib/email/sendEmail";
import { renderEmailSendRequest } from "@/lib/email/emailService";
import type { EmailSendRequest } from "@/lib/validations/email.schema";

/**
 * Build the Supabase Auth verify URL used in email buttons (PKCE / server redirect flow).
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */
export function buildSupabaseVerifyUrl(options: {
  supabaseUrl: string;
  token: string;
  /** `type` query param for /auth/v1/verify (e.g. signup, recovery, magiclink, email_change). */
  flowType: string;
  redirectTo: string;
}): string {
  const base = options.supabaseUrl.replace(/\/$/, "");
  const q = new URLSearchParams({
    token: options.token,
    type: options.flowType,
    redirect_to: options.redirectTo,
  });
  return `${base}/auth/v1/verify?${q.toString()}`;
}

/**
 * Map Supabase `email_action_type` to the `type` query param for `/auth/v1/verify`.
 */
export function supabaseFlowTypeFromAction(action: string): string {
  const map: Record<string, string> = {
    signup: "signup",
    invite: "signup",
    recovery: "recovery",
    magiclink: "magiclink",
    email_change: "email_change",
    reauthentication: "magiclink",
  };
  return map[action] ?? "signup";
}

/**
 * Render and send a templated email. Use {@link EmailSendRequest} payloads from validated API input.
 */
export async function sendEmail(request: EmailSendRequest): Promise<{ id: string }> {
  const { subject, html } = await renderEmailSendRequest(request);
  return deliverEmail({ to: request.to, subject, html });
}

export type { EmailSendRequest };
export type { EmailSendRequestType as EmailType } from "@/lib/validations/email.schema";
