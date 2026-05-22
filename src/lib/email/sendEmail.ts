/**
 * Low-level email transport: Nodemailer SMTP (no template rendering).
 *
 * Refactored out of `src/lib/email.ts` so content generation (template mapper + React Email)
 * stays separate from delivery. This keeps one place for SMTP config and optional mock mode.
 *
 * `to` is always the real recipient inbox (test page, API, or Supabase hook).
 */

import "server-only";

import { getSmtpTransporter } from "@/lib/email/transporter";

function isMockMode(): boolean {
  const v = process.env.EMAIL_MOCK?.trim().toLowerCase();
  return v === "true" || v === "1";
}

function resolveFromAddress(): string {
  const display = process.env.EMAIL_FROM_DISPLAY_NAME?.trim() || "TravelTourUp";
  const configured = process.env.EMAIL_FROM?.trim();

  if (!configured) {
    throw new Error("EMAIL_FROM is not set");
  }

  if (configured.includes("<") && configured.includes(">")) {
    return configured;
  }

  return `${display} <${configured}>`;
}

function mergeReplyToAddresses(extra: string | undefined): string | undefined {
  if (!extra?.trim()) return undefined;
  return extra.trim();
}

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  /** Sets Reply-To so recipients can reply to the submitter (e.g. contact form). */
  replyTo?: string;
  /** Optional PDF or other raw attachments. */
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

/**
 * Deliver a rendered email. When `EMAIL_MOCK` is unset/false, sends via SMTP (real delivery).
 * Set `EMAIL_MOCK=true` only in CI or when you must avoid calling SMTP (no credentials).
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ id: string }> {
  const { to, subject, html, replyTo, attachments } = payload;

  if (isMockMode()) {
    console.info(
      `[email] EMAIL_MOCK: skipping SMTP send to=${to} subject=${subject} htmlBytes=${html.length} attachments=${attachments?.length ?? 0}`,
    );
    return { id: `mock_${Date.now()}` };
  }

  try {
    const from = resolveFromAddress();
    const mergedReplyTo = mergeReplyToAddresses(replyTo);

    const info = await getSmtpTransporter().sendMail({
      from,
      to,
      subject,
      html,
      ...(mergedReplyTo ? { replyTo: mergedReplyTo } : {}),
      ...(attachments && attachments.length > 0
        ? {
            attachments: attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              ...(a.contentType ? { contentType: a.contentType } : {}),
            })),
          }
        : {}),
    });

    const id = info.messageId;
    if (!id) {
      console.error("[email] SMTP returned no messageId", info);
      throw new Error("SMTP send failed: missing message id");
    }

    return { id };
  } catch (err) {
    console.error("[email] SMTP send failed:", err);
    throw err;
  }
}
