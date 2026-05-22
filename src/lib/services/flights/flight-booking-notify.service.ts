import "server-only";

import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { sendFlightBookingConfirmationEmailSafe } from "@/lib/email/flight-booking-confirmation.email";
import { logger } from "@/lib/obs/logger";
import { prisma } from "@/lib/prisma";
import { flightOfferFromBookingSnapshot } from "@/lib/services/flights/flight-itinerary-pdf-input";
import {
  ensureFlightTicketAndNotify,
  tryGenerateAndPersistItineraryPdf,
} from "@/lib/services/flights/flight-ticket-document.service";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";

type StoredGuestData = {
  order_mode?: string;
  contact?: { email?: string };
  passengers?: FlightCheckoutBookingBody["passengers"];
  customer_charge?: { amount?: string; currency?: string };
};

function parseGuestData(guest: unknown): StoredGuestData {
  if (!guest || typeof guest !== "object") return {};
  return guest as StoredGuestData;
}

function bookingMode(row: {
  status: string;
  payment_status: string;
  guest_data: unknown;
}): "instant" | "hold" {
  const guest = parseGuestData(row.guest_data);
  if (guest.order_mode === "hold") return "hold";
  if (row.status === "pending" && row.payment_status === "unpaid") return "hold";
  return "instant";
}

function passengersFromGuest(guest: unknown): FlightCheckoutBookingBody["passengers"] {
  const parsed = parseGuestData(guest);
  return Array.isArray(parsed.passengers) ? parsed.passengers : [];
}

/**
 * Background work after a flight booking row exists: generate itinerary PDF, send confirmation
 * email with attachment. Keeps POST /flights/bookings fast (Duffel order only on critical path).
 */
export async function notifyFlightBookingConfirmed(bookingId: string): Promise<void> {
  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { flightBooking: true },
  });

  if (!row || row.type !== "flight" || !row.flightBooking) {
    return;
  }

  const fb = row.flightBooking;
  const guest = parseGuestData(row.guest_data);
  const passengers = passengersFromGuest(row.guest_data);
  const mode = bookingMode(row);
  const offer: FlightOfferDTO | null = flightOfferFromBookingSnapshot(fb);

  if (!offer) {
    logger.warn("Flight confirmation skipped: no offer snapshot on booking", {
      booking_id: row.id,
    });
    return;
  }

  const itineraryPdf = await tryGenerateAndPersistItineraryPdf(row);

  await sendFlightBookingConfirmationEmailSafe({
    mode,
    bookingId: row.id,
    bookingRefNo: row.booking_ref_no,
    airlineRecordLocator: fb.booking_reference,
    offer,
    passengers,
    contactEmail: guest.contact?.email ?? null,
    itineraryPdf,
    orderTotalAmount: row.total_amount.toString(),
    orderTotalCurrency: row.currency,
    chargedAmount: mode === "instant" ? guest.customer_charge?.amount : undefined,
    chargedCurrency: mode === "instant" ? guest.customer_charge?.currency : undefined,
  });

  if (!itineraryPdf) {
    await ensureFlightTicketAndNotify(bookingId, { sendStandaloneItineraryEmail: true });
  }

  logger.info("Flight booking confirmation notified", {
    booking_id: row.id,
    mode,
    itinerary_attached: Boolean(itineraryPdf?.length),
  });
}
