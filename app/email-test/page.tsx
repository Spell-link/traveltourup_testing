"use client";

import { useState } from "react";
import { EmailBookingSubType, EmailType } from "@/types/email";
import { triggerTestEmail, verifySmtp } from "./actions";

const emailTypes = Object.values(EmailType).filter((v) => typeof v === "string") as EmailType[];
const bookingSubTypes = Object.values(EmailBookingSubType).filter((v) => typeof v === "string") as EmailBookingSubType[];

export default function EmailTestPage() {
  const [emailType, setEmailType] = useState<EmailType>(EmailType.register);
  const [bookingSubType, setBookingSubType] = useState<EmailBookingSubType>(EmailBookingSubType.flight);
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function onVerifySmtp() {
    setVerifying(true);
    setVerifyResult(null);
    setError(null);
    setSuccess(null);
    const result = await verifySmtp();
    setVerifying(false);
    if (result.ok) {
      setVerifyResult("SMTP connection verified successfully.");
    } else {
      setVerifyResult(result.error);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    setVerifyResult(null);
    const result = await triggerTestEmail({
      emailType,
      bookingSubType: emailType === EmailType.booking ? bookingSubType : null,
      to,
    });
    setLoading(false);
    if (result.ok) {
      setSuccess(`Sent. Message id: ${result.messageId}`);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-sans">
      <h1 className="text-2xl font-semibold text-slate-900">Email test</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sends via the same pipeline as <code className="rounded bg-slate-100 px-1">POST /api/email/send</code>. In{" "}
        <code className="rounded bg-slate-100 px-1">npm run dev</code>,{" "}
        <code className="rounded bg-slate-100 px-1">EMAIL_SERVER_SECRET</code> is optional (in-process send). For real
        delivery set <code className="rounded bg-slate-100 px-1">SMTP_HOST</code>,{" "}
        <code className="rounded bg-slate-100 px-1">SMTP_USER</code>,{" "}
        <code className="rounded bg-slate-100 px-1">SMTP_PASS</code>, and{" "}
        <code className="rounded bg-slate-100 px-1">EMAIL_FROM</code>. Use{" "}
        <code className="rounded bg-slate-100 px-1">SMTP_HOST=smtp.hostinger.com</code> and{" "}
        <code className="rounded bg-slate-100 px-1">SMTP_PORT=465</code> for Hostinger mail. Enable{" "}
        <strong>Third-party app access</strong> in webmail if auth fails. Use a secret + Bearer when testing the HTTP
        route (e.g. production).
      </p>

      <div className="mt-6">
        <button
          type="button"
          onClick={onVerifySmtp}
          disabled={verifying || loading}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {verifying ? "Verifying…" : "Verify SMTP connection"}
        </button>
      </div>

      {verifyResult ? (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm whitespace-pre-wrap ${
            verifyResult.includes("failed") || verifyResult.includes("rejected")
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {verifyResult}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700">
            Email type
          </label>
          <select
            id="type"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as EmailType)}
          >
            {emailTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {emailType === EmailType.booking ? (
          <div>
            <label htmlFor="subType" className="block text-sm font-medium text-slate-700">
              Booking subtype
            </label>
            <select
              id="subType"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              value={bookingSubType}
              onChange={(e) => setBookingSubType(e.target.value as EmailBookingSubType)}
            >
              {bookingSubTypes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="to" className="block text-sm font-medium text-slate-700">
            Recipient (To)
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            This address is sent as the email <strong>To</strong> field. The sender (<strong>From</strong>) comes from{" "}
            <code className="rounded bg-slate-100 px-1">EMAIL_FROM</code> in{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code>.
          </p>
          <input
            id="to"
            type="email"
            required
            autoComplete="email"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading || verifying}
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send test email"}
        </button>
      </form>

      {success ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
    </div>
  );
}
