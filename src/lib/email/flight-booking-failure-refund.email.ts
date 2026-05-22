import "server-only";

import { sendEmail } from "@/lib/email";
import { EmailType } from "@/types/email";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";

function leadGuestName(passengers: FlightCheckoutBookingBody["passengers"]): string {
  const lead = passengers[0];
  if (!lead) return "Traveler";
  return [lead.given_name, lead.family_name].filter(Boolean).join(" ").trim() || "Traveler";
}

function recipientFromPassengers(
  passengers: FlightCheckoutBookingBody["passengers"] | undefined,
  contactEmail?: string | null,
): string | null {
  const fromContact = contactEmail?.trim();
  if (fromContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromContact)) return fromContact;
  const legacy = passengers?.[0] as { email?: string } | undefined;
  const e = legacy?.email?.trim();
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e;
  return null;
}

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`.trim();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${amount}`.trim();
  }
}

/**
 * Best-effort email after pay-now order failed: explains refund status.
 * Never throws.
 */
export async function sendFlightBookingFailureRefundEmailSafe(input: {
  passengers?: FlightCheckoutBookingBody["passengers"];
  contactEmail?: string | null;
  pitId: string;
  chargeAmount: string;
  chargeCurrency: string;
  refundId: string | null;
  refundStatus: string | null;
  terminalCode: "BOOKING_FAILED_REFUNDED" | "BOOKING_FAILED_REFUND_PENDING" | "BOOKING_FAILED_AFTER_PAYMENT";
}): Promise<void> {
  const to = recipientFromPassengers(input.passengers, input.contactEmail);
  if (!to) {
    console.warn("[email] Flight failure / refund notice skipped: no booking contact email.");
    return;
  }

  const guestName = leadGuestName(input.passengers ?? []);
  const amount = formatMoney(input.chargeAmount, input.chargeCurrency);

  let summary: string;
  let subject: string;
  const refLabel = input.refundId?.trim() ? input.refundId.trim() : input.pitId;

  if (input.terminalCode === "BOOKING_FAILED_REFUNDED") {
    subject = "Refund processed — your flight could not be confirmed";
    summary =
      "The airline could not confirm this booking after your card was charged. Your payment has been refunded to your card. It may take several business days to appear on your statement.";
  } else if (input.terminalCode === "BOOKING_FAILED_REFUND_PENDING") {
    subject = "Refund in progress — flight not confirmed";
    summary =
      "The airline could not confirm this booking after your card was charged. We have started a refund to your card. It may take a short time to complete; please check your statement in the next few business days.";
  } else {
    subject = "Important — flight booking could not be completed";
    summary =
      "The airline could not confirm this booking after your card was charged. Our team is working to return your payment. If you do not see a refund soon, please contact us with the payment reference below.";
  }

  const statusNote =
    input.refundStatus && input.refundId
      ? `Refund reference: ${input.refundId} (status: ${input.refundStatus}).`
      : input.refundId
        ? `Refund reference: ${input.refundId}.`
        : `Payment session reference: ${input.pitId}.`;

  try {
    await sendEmail({
      type: EmailType.refund,
      to,
      subject,
      data: {
        refundId: refLabel.slice(0, 120),
        guestName,
        amount,
        summary: `${summary}\n\n${statusNote}`,
      },
    });
    console.info(`[email] Flight failure refund notice sent pit=${input.pitId} code=${input.terminalCode}`);
  } catch (err) {
    console.error("[email] Flight failure refund notice failed:", err);
  }
}
