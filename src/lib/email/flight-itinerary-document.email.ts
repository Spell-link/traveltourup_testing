import "server-only";

import { sendEmail } from "@/lib/email/sendEmail";
import { generateFlightItineraryReadyHtml } from "@/lib/email/templates/flightItineraryReady";
import { flightItineraryPdfEmailAttachment } from "@/lib/flights/itinerary-pdf.constants";
import { bookingContactEmailFromGuestData } from "@/lib/services/flights/flight-itinerary-pdf-input";
import type { ItineraryPdfPassenger } from "@/lib/services/flights/flight-itinerary-pdf";

function leadPassenger(guest: unknown, passengers: ItineraryPdfPassenger[]): ItineraryPdfPassenger | null {
  if (passengers.length > 0) return passengers[0];
  if (!guest || typeof guest !== "object") return null;
  const p = (guest as { passengers?: unknown }).passengers;
  if (!Array.isArray(p) || p.length === 0) return null;
  const lead = p[0];
  if (!lead || typeof lead !== "object") return null;
  return lead as ItineraryPdfPassenger;
}

function guestNameFrom(passenger: ItineraryPdfPassenger | null): string {
  if (!passenger) return "Traveler";
  const parts = [passenger.given_name, passenger.family_name]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x));
  return parts.length > 0 ? parts.join(" ") : "Traveler";
}

function recipientEmailFromGuest(
  guest: unknown,
  passengers: ItineraryPdfPassenger[],
): string | null {
  const fromContact = bookingContactEmailFromGuestData(guest);
  if (fromContact) return fromContact;

  if (!guest || typeof guest !== "object") return null;
  const root = guest as Record<string, unknown>;
  const lead = leadPassenger(guest, passengers);
  const candidates = [
    typeof root.email === "string" ? root.email : null,
    lead && typeof (lead as { email?: string }).email === "string"
      ? (lead as { email: string }).email
      : null,
  ];
  for (const c of candidates) {
    if (c && c.includes("@")) return c.trim();
  }
  return null;
}

/**
 * Second transactional email after booking: HTML + PDF attachment. Best-effort; logs only on failure.
 */
export async function sendFlightItineraryReadyEmail(input: {
  bookingRefNo: string;
  guestData: unknown;
  passengers: ItineraryPdfPassenger[];
  manageUrl: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  const to = recipientEmailFromGuest(input.guestData, input.passengers);
  if (!to) {
    console.warn("[email] Flight itinerary PDF email skipped: no recipient.");
    return;
  }

  const guestName = guestNameFrom(leadPassenger(input.guestData, input.passengers));
  const html = await generateFlightItineraryReadyHtml({
    bookingReference: input.bookingRefNo,
    guestName,
    manageUrl: input.manageUrl,
  });

  try {
    await sendEmail({
      to,
      subject: `Your flight itinerary — ${input.bookingRefNo}`,
      html,
      attachments: [flightItineraryPdfEmailAttachment(input.bookingRefNo, input.pdfBuffer)],
    });
  } catch (e) {
    console.error("[email] Flight itinerary PDF email failed:", e);
  }
}
