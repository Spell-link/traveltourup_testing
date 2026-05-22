import "server-only";

import { getSiteUrl } from "@/config/site-url";
import { formatMoneyDisplay } from "@/lib/currency/format-display";
import { sendEmail } from "@/lib/email";
import { EmailType } from "@/types/email";
import { logger } from "@/lib/obs/logger";

type FlightBookingLikePassenger = {
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
};

type FlightBookingLike = {
  id: string;
  booking_ref_no: string;
  guest_data: unknown;
  flightBooking?: {
    booking_reference?: string | null;
  } | null;
};

function leadPassenger(
  booking: FlightBookingLike,
): FlightBookingLikePassenger | null {
  const data = booking.guest_data;
  if (!data || typeof data !== "object") return null;
  const passengers = (data as { passengers?: unknown }).passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return null;
  const lead = passengers[0];
  if (!lead || typeof lead !== "object") return null;
  return lead as FlightBookingLikePassenger;
}

function guestNameFrom(passenger: FlightBookingLikePassenger | null): string {
  if (!passenger) return "Traveller";
  const parts = [passenger.given_name, passenger.family_name]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" ") : "Traveller";
}

function recipientEmailFrom(
  booking: FlightBookingLike,
): string | null {
  const data = booking.guest_data;
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const lead = leadPassenger(booking);
  const candidates = [
    typeof root.email === "string" ? root.email : null,
    typeof lead?.email === "string" ? lead.email : null,
  ];
  for (const c of candidates) {
    if (c && c.includes("@")) return c.trim();
  }
  return null;
}

function summaryFor(booking: FlightBookingLike): string {
  const airlineRef = booking.flightBooking?.booking_reference ?? null;
  return airlineRef
    ? `Ref ${booking.booking_ref_no} (airline PNR ${airlineRef}).`
    : `Ref ${booking.booking_ref_no}.`;
}

/**
 * Sends the "cancellation confirmed" notification. Best-effort: never throws,
 * because the cancellation itself has already persisted upstream.
 */
export async function sendFlightCancellationEmail(input: {
  booking: FlightBookingLike;
  refundAmount?: string | null;
  refundCurrency?: string | null;
  refundTo?: string | null;
}): Promise<void> {
  const to = recipientEmailFrom(input.booking);
  if (!to) return;
  const guestName = guestNameFrom(leadPassenger(input.booking));

  const base = getSiteUrl().replace(/\/$/, "");
  const manageUrl = `${base}/profile/bookings/${encodeURIComponent(input.booking.id)}`;
  const airlineRef = input.booking.flightBooking?.booking_reference ?? null;

  let refundAmountDisplay: string | undefined;
  if (input.refundAmount && input.refundCurrency) {
    const n = Number.parseFloat(input.refundAmount);
    if (Number.isFinite(n)) {
      refundAmountDisplay = formatMoneyDisplay(n, input.refundCurrency.toUpperCase(), "en-US");
    } else {
      refundAmountDisplay = `${input.refundCurrency.toUpperCase()} ${input.refundAmount}`.trim();
    }
  }

  const securityNote =
    "If you did not request this cancellation, contact us immediately at support@traveltourup.com with your booking reference.";

  try {
    await sendEmail({
      type: EmailType.cancel,
      to,
      data: {
        bookingReference: input.booking.booking_ref_no,
        guestName,
        summary: securityNote,
        manageUrl,
        airlineRecordLocator: airlineRef ?? undefined,
        refundAmountDisplay,
        refundTo: input.refundTo ?? undefined,
      },
    });
  } catch (e) {
    logger.warn("Flight cancellation email failed", {
      booking_id: input.booking.id,
      error_code: e instanceof Error ? e.message.slice(0, 120) : "EMAIL_FAILED",
    });
  }
}

/**
 * Sends the "refund processed" notification when a Duffel refund settles to
 * `succeeded` (or partial). Best-effort.
 */
export async function sendFlightRefundEmail(input: {
  booking: FlightBookingLike;
  refundId: string;
  amount: string;
  currency: string;
  partial?: boolean;
}): Promise<void> {
  const to = recipientEmailFrom(input.booking);
  if (!to) return;
  const guestName = guestNameFrom(leadPassenger(input.booking));

  try {
    await sendEmail({
      type: EmailType.refund,
      to,
      data: {
        refundId: input.refundId,
        guestName,
        amount: `${input.amount} ${input.currency}`,
        summary: input.partial
          ? `Partial refund processed for ${summaryFor(input.booking)}`
          : `Refund processed for ${summaryFor(input.booking)}`,
      },
    });
  } catch (e) {
    logger.warn("Flight refund email failed", {
      booking_id: input.booking.id,
      error_code: e instanceof Error ? e.message.slice(0, 120) : "EMAIL_FAILED",
    });
  }
}

/** Best-effort order change confirmation email. */
export async function sendFlightOrderChangeEmailSafe(input: {
  booking: FlightBookingLike;
  changeAmount: string | null;
  changeCurrency: string | null;
  duffelOrderChangeId: string;
}): Promise<void> {
  const to = recipientEmailFrom(input.booking);
  if (!to) return;
  const guestName = guestNameFrom(leadPassenger(input.booking));
  const base = getSiteUrl().replace(/\/$/, "");
  const manageUrl = `${base}/profile/bookings/${encodeURIComponent(input.booking.id)}`;

  let deltaDisplay: string | undefined;
  if (input.changeAmount && input.changeCurrency) {
    const n = Number.parseFloat(input.changeAmount);
    if (Number.isFinite(n)) {
      deltaDisplay = formatMoneyDisplay(Math.abs(n), input.changeCurrency.toUpperCase(), "en-US");
    }
  }

  const summaryParts = [
    `Your flight change (${input.duffelOrderChangeId}) is confirmed.`,
    deltaDisplay
      ? Number.parseFloat(input.changeAmount ?? "0") < 0
        ? `A refund of ${deltaDisplay} will be returned to your original payment method where applicable.`
        : Number.parseFloat(input.changeAmount ?? "0") > 0
          ? `Additional charge: ${deltaDisplay}.`
          : undefined
      : undefined,
    "View your updated itinerary in My bookings.",
  ].filter(Boolean);

  try {
    await sendEmail({
      type: EmailType.cancel,
      to,
      data: {
        bookingReference: input.booking.booking_ref_no,
        guestName,
        summary: summaryParts.join(" "),
        manageUrl,
        airlineRecordLocator: input.booking.flightBooking?.booking_reference ?? undefined,
      },
      subject: `Flight change confirmed — ${input.booking.booking_ref_no}`,
    });
  } catch (e) {
    logger.warn("Flight order change email failed", {
      booking_id: input.booking.id,
      error_code: e instanceof Error ? e.message.slice(0, 120) : "EMAIL_FAILED",
    });
  }
}
