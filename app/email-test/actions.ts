"use server";

import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";
import { verifySmtpConnection } from "@/lib/email/transporter";
import { EmailBookingSubType, EmailType } from "@/types/email";
import { parseEmailSendRequest } from "@/lib/validations/email.schema";
import { sampleDataForEmail } from "./sample-email-data";

type TriggerResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

type VerifyResult = { ok: true } | { ok: false; error: string };

/** Verifies Hostinger Titan SMTP credentials and connectivity. */
export async function verifySmtp(): Promise<VerifyResult> {
  return verifySmtpConnection();
}

function buildRequestBody(input: {
  emailType: EmailType;
  bookingSubType: EmailBookingSubType | null;
  to: string;
}): Record<string, unknown> {
  const { emailType, bookingSubType, to } = input;
  const data = sampleDataForEmail(
    emailType,
    emailType === EmailType.booking ? bookingSubType ?? undefined : undefined,
    to,
  );

  const body: Record<string, unknown> = {
    type: emailType,
    to,
    data,
  };
  if (emailType === EmailType.booking) {
    body.subType = bookingSubType ?? EmailBookingSubType.flight;
  }
  return body;
}

/**
 * Triggers the same send pipeline as `POST /api/email/send`.
 * - **Development** without `EMAIL_SERVER_SECRET`: calls `sendEmail` in-process (no Bearer) so the test page works out of the box.
 * - **With secret set**: `fetch`es the API (matches production / mobile clients).
 */
export async function triggerTestEmail(input: {
  emailType: EmailType;
  bookingSubType: EmailBookingSubType | null;
  to: string;
}): Promise<TriggerResult> {
  const secret = process.env.EMAIL_SERVER_SECRET?.trim();
  const body = buildRequestBody(input);

  const isDev = process.env.NODE_ENV === "development";

  if (isDev && !secret) {
    try {
      const parsed = parseEmailSendRequest(body);
      const result = await sendEmail(parsed);
      return { ok: true, messageId: result.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { ok: false, error: msg };
    }
  }

  if (!secret) {
    return {
      ok: false,
      error:
        "EMAIL_SERVER_SECRET is not set. Add it to your environment (see .env.example) or run `npm run dev` to use the local bypass.",
    };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (host ? `${proto}://${host}` : "http://localhost:3000");

  try {
    const res = await fetch(`${base}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { id?: string };
      message?: string;
    } | null;

    if (!res.ok || !json?.success) {
      const msg = json?.message ?? `Request failed (${res.status})`;
      return { ok: false, error: msg };
    }

    const id = json.data?.id;
    if (!id) {
      return { ok: false, error: "Missing message id in response." };
    }

    return { ok: true, messageId: id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
