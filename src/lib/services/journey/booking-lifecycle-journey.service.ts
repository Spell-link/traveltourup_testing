import "server-only";

import type { JourneyProductType } from "@/lib/constants/customer-journey";
import { prisma } from "@/lib/prisma";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";

type BookingJourneyContext = {
  userId: string;
  productType: JourneyProductType;
  productRef: string;
};

async function resolveBookingJourneyContext(bookingId: string): Promise<BookingJourneyContext | null> {
  const interest = await prisma.customerProductInterest.findFirst({
    where: { converted_booking_id: bookingId },
    select: { user_id: true, product_type: true, product_ref: true },
    orderBy: { last_seen_at: "desc" },
  });
  if (interest) {
    return {
      userId: interest.user_id,
      productType: interest.product_type as JourneyProductType,
      productRef: interest.product_ref,
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      user_id: true,
      type: true,
      booking_ref_no: true,
      flightBooking: { select: { duffel_offer_id: true } },
      hotelBooking: { select: { stays_search_result_id: true, duffel_quote_id: true } },
    },
  });
  if (!booking?.user_id) return null;

  const productType =
    booking.type === "hotel" ? "hotel" : booking.type === "flight" ? "flight" : null;
  if (!productType) return null;

  const productRef =
    booking.flightBooking?.duffel_offer_id ??
    booking.hotelBooking?.stays_search_result_id ??
    booking.hotelBooking?.duffel_quote_id ??
    booking.booking_ref_no;
  if (!productRef) return null;

  return { userId: booking.user_id, productType, productRef };
}

/** After a confirmed cancellation — links back to the original funnel interest via booking id. */
export function trackBookingCancelledJourney(input: {
  bookingId: string;
  properties?: Record<string, unknown>;
}): void {
  void (async () => {
    const ctx = await resolveBookingJourneyContext(input.bookingId);
    if (!ctx) return;

    trackJourneyEvent({
      userId: ctx.userId,
      eventType: "booking.cancelled",
      productType: ctx.productType,
      productRef: ctx.productRef,
      stage: "booking_cancelled",
      convertedBookingId: input.bookingId,
      properties: input.properties ?? null,
    });
  })().catch(() => undefined);
}

/** When a customer requests a flight change quote (before payment / confirm). */
export function trackBookingChangeStartedJourney(input: {
  bookingId: string;
  properties?: Record<string, unknown>;
}): void {
  void (async () => {
    const ctx = await resolveBookingJourneyContext(input.bookingId);
    if (!ctx || ctx.productType !== "flight") return;

    trackJourneyEvent({
      userId: ctx.userId,
      eventType: "booking.change_started",
      productType: ctx.productType,
      productRef: ctx.productRef,
      stage: "booking_confirmed",
      convertedBookingId: input.bookingId,
      preserveStage: true,
      properties: input.properties ?? null,
    });
  })().catch(() => undefined);
}

/** After a flight order change is confirmed with the airline. */
export function trackBookingChangedJourney(input: {
  bookingId: string;
  properties?: Record<string, unknown>;
  priceAmount?: string | null;
  priceCurrency?: string | null;
}): void {
  void (async () => {
    const ctx = await resolveBookingJourneyContext(input.bookingId);
    if (!ctx || ctx.productType !== "flight") return;

    trackJourneyEvent({
      userId: ctx.userId,
      eventType: "booking.changed",
      productType: ctx.productType,
      productRef: ctx.productRef,
      stage: "booking_changed",
      convertedBookingId: input.bookingId,
      properties: input.properties ?? null,
      priceAmount: input.priceAmount ?? null,
      priceCurrency: input.priceCurrency ?? null,
    });
  })().catch(() => undefined);
}
