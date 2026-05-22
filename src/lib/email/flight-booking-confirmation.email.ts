import "server-only";

import { getSiteUrl } from "@/config/site-url";
import { renderEmailSendRequest } from "@/lib/email/emailService";
import { sendEmail as deliverEmail } from "@/lib/email/sendEmail";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { flightItineraryPdfEmailAttachment } from "@/lib/flights/itinerary-pdf.constants";
import { EmailBookingSubType, EmailType } from "@/types/email";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`.trim();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${amount}`.trim();
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatRouteFromOffer(offer: FlightOfferDTO): string {
  if (!offer.slices?.length) return "Your flight";
  const parts = offer.slices.map((s) => {
    const from = s.origin_iata ?? s.segments[0]?.origin_iata;
    const to = s.destination_iata ?? s.segments[s.segments.length - 1]?.destination_iata;
    if (!from || !to) return null;
    return `${from} → ${to}`;
  });
  const valid = parts.filter(Boolean) as string[];
  return valid.length > 0 ? valid.join(" · ") : "Your flight";
}

function formatItineraryDates(offer: FlightOfferDTO): string {
  const lines: string[] = [];
  const dep = offer.slices[0]?.segments[0]?.departing_at;
  if (dep) lines.push(`Departure: ${formatDateTime(dep)}`);
  if (offer.slices.length > 1) {
    const lastSlice = offer.slices[offer.slices.length - 1];
    const lastSeg = lastSlice?.segments?.[lastSlice.segments.length - 1];
    const ret = lastSeg?.departing_at ?? lastSeg?.arriving_at;
    if (ret) lines.push(`Return: ${formatDateTime(ret)}`);
  }
  return lines.length > 0 ? lines.join("\n") : "Open your booking in TravelTourUp for full times and terminals.";
}

function leadGuestName(passengers: FlightCheckoutBookingBody["passengers"]): string {
  const lead = passengers[0];
  if (!lead) return "Traveler";
  return [lead.given_name, lead.family_name].filter(Boolean).join(" ").trim() || "Traveler";
}

function passengersSummaryLine(passengers: FlightCheckoutBookingBody["passengers"]): string {
  const names = passengers
    .map((p) => [p.given_name, p.family_name].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  return names.join(", ");
}

function recipientEmailFromPassengers(
  passengers: FlightCheckoutBookingBody["passengers"],
  contactEmail?: string | null,
): string | null {
  const fromContact = contactEmail?.trim();
  if (fromContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromContact)) return fromContact;
  const legacy = passengers[0] as { email?: string } | undefined;
  const e = legacy?.email?.trim();
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e;
  return null;
}

/**
 * Sends the transactional flight confirmation after the booking row exists.
 * When `itineraryPdf` is provided, attaches the same itinerary PDF as My bookings → Export itinerary.
 * Best-effort only: logs and returns if there is no contact email or SMTP send fails.
 * Never throws (booking already succeeded).
 */
export async function sendFlightBookingConfirmationEmailSafe(input: {
  mode: "instant" | "hold";
  bookingId: string;
  bookingRefNo: string;
  airlineRecordLocator: string | null;
  offer: FlightOfferDTO;
  passengers: FlightCheckoutBookingBody["passengers"];
  contactEmail?: string | null;
  /** Same PDF bytes as GET /api/v1/bookings/:id/itinerary (when generation succeeded). */
  itineraryPdf?: Buffer | null;
  /** Order total from Duffel (fare + taxes in order currency). */
  orderTotalAmount: string;
  orderTotalCurrency: string;
  /** Card charge for pay-now (may differ slightly from order line items); omit for hold. */
  chargedAmount?: string;
  chargedCurrency?: string;
}): Promise<void> {
  const to = recipientEmailFromPassengers(input.passengers, input.contactEmail);
  if (!to) {
    console.warn("[email] Flight confirmation skipped: no booking contact email.");
    return;
  }

  const base = getSiteUrl().replace(/\/$/, "");
  const manageUrl = `${base}/profile/bookings/${encodeURIComponent(input.bookingId)}`;
  const destination = formatRouteFromOffer(input.offer);
  const dates = formatItineraryDates(input.offer);
  const guestName = leadGuestName(input.passengers);
  const passengersSummaryRaw = passengersSummaryLine(input.passengers);
  const passengersSummary = passengersSummaryRaw.length > 0 ? passengersSummaryRaw : undefined;
  const hasItineraryPdf = Boolean(input.itineraryPdf?.length);

  let total: string;
  let statusNote: string;
  let subject: string;

  if (input.mode === "instant") {
    const amt = input.chargedAmount ?? input.orderTotalAmount;
    const cur = input.chargedCurrency ?? input.orderTotalCurrency;
    total = formatMoney(amt, cur);
    statusNote = hasItineraryPdf
      ? "Your payment was received. Your printable itinerary PDF is attached (same as Export itinerary in My bookings). Keep this email for check-in and support — it is a confirmation, not a boarding pass."
      : "Your payment was received. Your itinerary and booking references below match what you booked — keep this email for check-in and support. You can download your itinerary PDF from My bookings.";
    subject = `Booking confirmed — ${destination} (${input.bookingRefNo})`;
  } else {
    total = `${formatMoney(input.orderTotalAmount, input.orderTotalCurrency)} (due when you complete payment)`;
    statusNote = hasItineraryPdf
      ? "Your fare is on hold. A provisional itinerary PDF is attached. Complete payment from My bookings before the hold expires — you'll receive another confirmation once paid."
      : "Your fare is on hold. Complete payment from your TravelTourUp account before the hold expires — you'll receive another confirmation once paid.";
    subject = `Flight hold placed — ${destination} (${input.bookingRefNo})`;
  }

  try {
    const { subject: renderedSubject, html } = await renderEmailSendRequest({
      type: EmailType.booking,
      subType: EmailBookingSubType.flight,
      to,
      subject,
      data: {
        bookingReference: input.bookingRefNo,
        guestName,
        destination,
        dates,
        total,
        manageUrl,
        airlineRecordLocator: input.airlineRecordLocator ?? undefined,
        passengersSummary,
        statusNote,
        itineraryAttached: hasItineraryPdf,
      },
    });

    await deliverEmail({
      to,
      subject: renderedSubject,
      html,
      attachments: hasItineraryPdf
        ? [flightItineraryPdfEmailAttachment(input.bookingRefNo, input.itineraryPdf!)]
        : undefined,
    });
    console.info(
      `[email] Flight ${input.mode} confirmation sent bookingId=${input.bookingId} to=${to} itineraryPdf=${hasItineraryPdf}`,
    );
  } catch (err) {
    console.error("[email] Flight booking confirmation send failed:", err);
  }
}
