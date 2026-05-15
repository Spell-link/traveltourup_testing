import "server-only";

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

  const refundLine =
    input.refundAmount && input.refundCurrency
      ? input.refundTo === "airline_credits"
        ? `Airline credits issued: ${input.refundAmount} ${input.refundCurrency}.`
        : `A refund of ${input.refundAmount} ${input.refundCurrency} is being processed back to your original payment method.`
      : "We will follow up with refund details shortly.";

  try {
    await sendEmail({
      type: EmailType.cancel,
      to,
      data: {
        bookingReference: input.booking.booking_ref_no,
        guestName,
        summary: `${summaryFor(input.booking)} ${refundLine}`,
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
