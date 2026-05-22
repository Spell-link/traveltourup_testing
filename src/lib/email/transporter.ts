/**
 * Hostinger email SMTP transporter (singleton per serverless invocation).
 * Hostinger-hosted Titan mailboxes authenticate against smtp.hostinger.com (not smtp.titan.email).
 */

import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporterSingleton: Transporter | null = null;

function smtpPort(): number {
  const raw = process.env.SMTP_PORT?.trim();
  const port = raw ? Number(raw) : 465;
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive number");
  }
  return port;
}

/** Port 465 uses implicit TLS; port 587 uses STARTTLS (`secure: false`). */
function smtpSecure(port: number): boolean {
  const override = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;
  return port === 465;
}

export function getSmtpTransporter(): Transporter {
  if (!transporterSingleton) {
    const host = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
    const port = smtpPort();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set");
    }

    const secure = smtpSecure(port);

    transporterSingleton = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      // Avoid hanging server actions when a port is blocked (common on 587 from home ISPs).
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
      ...(port === 587 && !secure ? { requireTLS: true } : {}),
    });
  }

  return transporterSingleton;
}

export type VerifySmtpResult = { ok: true } | { ok: false; error: string };

function hintForError(message: string, port: number): string {
  if (message.includes("ETIMEDOUT") || message.includes("ESOCKET")) {
    if (port === 587) {
      return `${message} — Port 587 may be blocked on your network. Set SMTP_PORT=465 in .env.local and restart the dev server.`;
    }
    return `${message} — Check SMTP_HOST and firewall. Enable third-party app access in Titan webmail.`;
  }
  if (
    message.includes("EAUTH") ||
    message.includes("535") ||
    message.toLowerCase().includes("authentication")
  ) {
    const host = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
    const hostHint =
      host === "smtp.titan.email"
        ? "6) Hostinger accounts often need SMTP_HOST=smtp.hostinger.com (not smtp.titan.email)."
        : "";
    return [
      message,
      "SMTP login rejected. Fix in this order:",
      "1) Log in at Hostinger webmail with your full email — confirm the password works.",
      "2) Settings → Security → enable “Third-party app access”.",
      "3) Disable 2FA if enabled (blocks SMTP clients).",
      "4) SMTP_USER = full email, SMTP_PASS = mailbox password; restart npm run dev.",
      "5) Use SMTP_HOST=smtp.hostinger.com and SMTP_PORT=465 for Hostinger-hosted mail.",
      hostHint,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return message;
}

/**
 * Verifies SMTP credentials and connectivity (useful for /email-test and local dev).
 */
export async function verifySmtpConnection(): Promise<VerifySmtpResult> {
  try {
    await getSmtpTransporter().verify();
    console.info("[email] SMTP connection verified");
    return { ok: true };
  } catch (err) {
    const port = smtpPort();
    const raw = err instanceof Error ? err.message : "SMTP verification failed";
    const msg = hintForError(raw, port);
    console.error("[email] SMTP verification failed:", err);
    return { ok: false, error: msg };
  }
}
