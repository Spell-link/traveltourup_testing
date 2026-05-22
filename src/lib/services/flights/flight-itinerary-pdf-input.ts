import "server-only";

import { mapDuffelOfferToDto, type FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { resolveCarrierLogoUrl } from "@/lib/brand/carrier-logo-pdf-image";
import { buildFlightItineraryPdfBuffer, type BuildItineraryPdfInput, type ItineraryPdfPassenger } from "@/lib/services/flights/flight-itinerary-pdf";
import {
  FLIGHT_ITINERARY_PDF_LAYOUT_VERSION,
  flightItineraryPdfStorageSuffix,
  isCurrentItineraryPdfPath,
} from "@/lib/flights/itinerary-pdf.constants";

export { FLIGHT_ITINERARY_PDF_LAYOUT_VERSION, flightItineraryPdfStorageSuffix, isCurrentItineraryPdfPath };

function segmentHasRawDuffelCarrier(seg: unknown): boolean {
  if (!seg || typeof seg !== "object") return false;
  const o = seg as Record<string, unknown>;
  return o.marketing_carrier != null && typeof o.marketing_carrier === "object";
}

function asFlightOffer(snapshot: unknown): FlightOfferDTO | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const o = snapshot as { slices?: unknown };
  if (!Array.isArray(o.slices)) return null;

  const firstSlice = o.slices[0];
  const firstSeg =
    firstSlice && typeof firstSlice === "object"
      ? (firstSlice as { segments?: unknown[] }).segments?.[0]
      : undefined;

  let offer: FlightOfferDTO;
  if (firstSeg && segmentHasRawDuffelCarrier(firstSeg)) {
    try {
      offer = mapDuffelOfferToDto(snapshot);
    } catch {
      return null;
    }
  } else {
    offer = snapshot as FlightOfferDTO;
  }

  return enrichOfferSegmentLogos(offer);
}

/** Ensures PDF can resolve logos even when snapshot omitted `marketing_carrier_logo_url`. */
function enrichOfferSegmentLogos(offer: FlightOfferDTO): FlightOfferDTO {
  return {
    ...offer,
    slices: offer.slices.map((slice) => ({
      ...slice,
      segments: slice.segments.map((seg) => ({
        ...seg,
        marketing_carrier_logo_url: resolveCarrierLogoUrl(
          seg.marketing_carrier_logo_url,
          seg.marketing_carrier_iata,
        ),
      })),
    })),
  };
}

export function passengersFromGuestData(guest: unknown): ItineraryPdfPassenger[] {
  if (!guest || typeof guest !== "object") return [];
  const passengers = (guest as { passengers?: unknown }).passengers;
  if (!Array.isArray(passengers)) return [];
  return passengers
    .filter((p): p is ItineraryPdfPassenger => p != null && typeof p === "object")
    .map((p) => {
      const row = p as Record<string, unknown>;
      return {
        given_name: typeof row.given_name === "string" ? row.given_name : null,
        family_name: typeof row.family_name === "string" ? row.family_name : null,
        born_on: typeof row.born_on === "string" ? row.born_on : null,
        gender: typeof row.gender === "string" ? row.gender : null,
        title: typeof row.title === "string" ? row.title : null,
        type: typeof row.type === "string" ? row.type : null,
      };
    });
}

type BookingPdfRow = {
  booking_ref_no: string;
  guest_data: unknown;
  total_amount: { toString(): string };
  currency: string;
  status: string;
  payment_status: string;
};

type FlightBookingPdfRow = {
  booking_reference: string | null;
  duffel_order_id: string | null;
  itinerary_snapshot: unknown;
  order_raw?: unknown;
};

function asFlightOfferFromBooking(fb: FlightBookingPdfRow): FlightOfferDTO | null {
  if (fb.order_raw) {
    try {
      const fromOrder = mapDuffelOfferToDto(fb.order_raw);
      if (fromOrder.slices?.length) {
        return enrichOfferSegmentLogos(fromOrder);
      }
    } catch {
      /* fall back to pre-booking offer snapshot */
    }
  }
  return asFlightOffer(fb.itinerary_snapshot);
}

/** Offer DTO for confirmation emails — prefers post-booking `order_raw`. */
export function flightOfferFromBookingSnapshot(fb: FlightBookingPdfRow): FlightOfferDTO | null {
  return asFlightOfferFromBooking(fb);
}

export function buildItineraryPdfInputFromBooking(
  row: BookingPdfRow,
  fb: FlightBookingPdfRow,
): BuildItineraryPdfInput {
  const offer = asFlightOfferFromBooking(fb);
  const guests = passengersFromGuestData(row.guest_data);
  const offerPax = offer?.passengers ?? [];
  const passengers = guests.map((p, i) => ({
    ...p,
    type: p.type ?? offerPax[i]?.type ?? "adult",
  }));
  const isHold =
    row.status === "pending" ||
    row.payment_status === "unpaid" ||
    (row.guest_data &&
      typeof row.guest_data === "object" &&
      (row.guest_data as { order_mode?: string }).order_mode === "hold");

  return {
    bookingRefNo: row.booking_ref_no,
    airlineRecordLocator: fb.booking_reference,
    duffelOrderId: fb.duffel_order_id,
    offer,
    passengers,
    totalAmount: row.total_amount.toString(),
    currency: row.currency,
    bookingStatus: row.status,
    paymentStatus: row.payment_status,
    isHoldBooking: Boolean(isHold),
  };
}

/** Single code path for API download, confirmation email, and storage. */
export async function buildFlightItineraryPdfBufferFromBooking(
  row: BookingPdfRow,
  fb: FlightBookingPdfRow,
): Promise<Buffer> {
  return buildFlightItineraryPdfBuffer(buildItineraryPdfInputFromBooking(row, fb));
}

export function bookingContactEmailFromGuestData(guest: unknown): string | null {
  if (!guest || typeof guest !== "object") return null;
  const root = guest as Record<string, unknown>;
  const contact = root.contact;
  if (contact && typeof contact === "object") {
    const email = (contact as { email?: string }).email?.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
  }
  return null;
}
