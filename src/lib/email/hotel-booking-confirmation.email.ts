import "server-only";

import { getSiteUrl } from "@/config/site-url";
import { renderEmailSendRequest } from "@/lib/email/emailService";
import { sendEmail as deliverEmail } from "@/lib/email/sendEmail";
import { EmailBookingSubType, EmailType } from "@/types/email";
import { hotelConfirmationPdfEmailAttachment } from "@/lib/hotels/confirmation-pdf.constants";
import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import {
  formatGuestNamesComma,
  formatGuestNamesMultiline,
} from "@/lib/stays/stays-booking-travelers";

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`.trim();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${amount}`.trim();
  }
}

function formatStayDate(ymd: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${ymd}T12:00:00`));
  } catch {
    return ymd;
  }
}

function formatStayDatesSummary(checkIn: string | null, checkOut: string | null): string {
  const lines: string[] = [];
  if (checkIn) lines.push(`Check-in: ${formatStayDate(checkIn)}`);
  if (checkOut) lines.push(`Check-out: ${formatStayDate(checkOut)}`);
  return lines.length > 0
    ? lines.join("\n")
    : "Open your booking in TravelTourUp for full stay dates and details.";
}

function leadGuestName(display: StaysBookingDisplay): string {
  const lead = display.guests[0];
  return lead?.fullName ?? "Guest";
}

function billingLine(
  amount: string | null | undefined,
  currency: string | null | undefined,
): string | undefined {
  if (!amount || !currency) return undefined;
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return formatMoney(amount, currency);
}

function recipientEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Sends the transactional hotel confirmation after the booking row exists.
 * Best-effort only: logs and returns if there is no contact email or SMTP send fails.
 * Never throws (booking already succeeded).
 */
export async function sendHotelBookingConfirmationEmailSafe(input: {
  bookingId: string;
  bookingRefNo: string;
  hotelName: string;
  hotelConfirmationReference: string | null;
  checkIn: string | null;
  checkOut: string | null;
  display: StaysBookingDisplay;
  contactEmail?: string | null;
  chargedAmount: string;
  chargedCurrency: string;
  confirmationPdf?: Buffer | null;
}): Promise<void> {
  const to = recipientEmail(input.contactEmail ?? input.display.contactEmail);
  if (!to) {
    console.warn("[email] Hotel confirmation skipped: no booking contact email.");
    return;
  }

  const base = getSiteUrl().replace(/\/$/, "");
  const manageUrl = `${base}/profile/bookings/${encodeURIComponent(input.bookingId)}`;
  const destination = input.hotelName;
  const dates = formatStayDatesSummary(input.checkIn, input.checkOut);
  const guestName = leadGuestName(input.display);
  const guestsSummary = formatGuestNamesComma(input.display.guests);
  const guestsDetail =
    input.display.guests.length > 0 ? formatGuestNamesMultiline(input.display.guests) : undefined;
  const total = formatMoney(input.chargedAmount, input.chargedCurrency);
  const billing = input.display.billing;
  const paidCur = billing.totalPaidCurrency ?? billing.totalCurrency;

  const statusNote = input.hotelConfirmationReference
    ? `Your payment was received and your stay is confirmed. Present hotel confirmation ${input.hotelConfirmationReference} at check-in along with photo ID.`
    : "Your payment was received and your stay is confirmed. Present this email and photo ID at check-in.";
  const subject = `Booking confirmed — ${destination} (${input.bookingRefNo})`;
  const hasConfirmationPdf = Boolean(input.confirmationPdf?.length);

  try {
    const { subject: renderedSubject, html } = await renderEmailSendRequest({
      type: EmailType.booking,
      subType: EmailBookingSubType.hotel,
      to,
      subject,
      data: {
        bookingReference: input.bookingRefNo,
        guestName,
        destination,
        dates,
        total,
        manageUrl,
        productLabel: "Hotel",
        airlineRecordLocator: input.hotelConfirmationReference ?? undefined,
        passengersSummary: guestsSummary.length > 0 ? guestsSummary : undefined,
        guestsDetail,
        contactEmail: input.display.contactEmail ?? undefined,
        contactPhone: input.display.contactPhone ?? undefined,
        specialRequests: input.display.specialRequests ?? undefined,
        loyaltyProgrammeAccountNumber: input.display.loyaltyProgrammeAccountNumber ?? undefined,
        billingRoom: billingLine(billing.supplierAmount ?? billing.roomAmount, billing.supplierCurrency ?? billing.roomCurrency),
        billingServiceFee: billingLine(billing.serviceFeeAmount, paidCur),
        billingTotalPaid: billingLine(
          billing.totalPaidAmount ?? billing.customerChargeAmount,
          paidCur,
        ),
        billingPayAtHotel: billingLine(
          billing.dueAtAccommodationAmount,
          billing.dueAtAccommodationCurrency,
        ),
        statusNote: hasConfirmationPdf
          ? `${statusNote} Your printable confirmation PDF is attached (same as Export confirmation in My bookings).`
          : statusNote,
        itineraryAttached: hasConfirmationPdf,
      },
    });

    await deliverEmail({
      to,
      subject: renderedSubject,
      html,
      attachments: hasConfirmationPdf
        ? [hotelConfirmationPdfEmailAttachment(input.bookingRefNo, input.confirmationPdf!)]
        : undefined,
    });
    console.info(
      `[email] Hotel confirmation sent bookingId=${input.bookingId} to=${to} voucherPdf=${hasConfirmationPdf}`,
    );
  } catch (err) {
    console.error("[email] Hotel booking confirmation send failed:", err);
  }
}
