import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import { bookingSnapshotToFlightDisplay } from "@/lib/flights/booking-snapshot-display";
import { evaluateFlightChangePolicy } from "@/lib/flights/flight-change-policy";
import type { OriginalBookingContext } from "@/lib/flights/flow-variant";
import type {
  FlightOrderChangeContextResult,
  FlightOrderChangeSliceOption,
} from "@/lib/http/flights.client";

export function buildOriginalBookingContext(input: {
  booking: BookingDetailDto;
  changeContext: FlightOrderChangeContextResult;
  selectedSliceId?: string | null;
}): OriginalBookingContext | null {
  const fb = input.booking.flight_booking;
  if (!fb) return null;

  const display = bookingSnapshotToFlightDisplay(
    fb.itinerary_snapshot,
    input.booking.total_amount,
    input.booking.currency,
  );
  if (!display) return null;

  const sliceOptions = input.changeContext.slices;
  const selectedSliceId =
    (input.selectedSliceId && sliceOptions.find((s) => s.slice_id === input.selectedSliceId)
      ? input.selectedSliceId
      : null) ?? sliceOptions[0]?.slice_id ?? "";
  const selectedSliceIndex = Math.max(
    0,
    sliceOptions.findIndex((s) => s.slice_id === selectedSliceId),
  );

  const totalN = Number.parseFloat(String(input.booking.total_amount));
  const changePolicy = evaluateFlightChangePolicy(fb.order_raw);

  return {
    bookingId: input.booking.id,
    bookingRefNo: input.booking.booking_ref_no,
    flight: display.flight,
    offer: display.offer,
    totalAmount: Number.isFinite(totalN) ? totalN : display.flight.price,
    currency: input.booking.currency,
    itinerarySnapshot: fb.itinerary_snapshot,
    orderRaw: fb.order_raw,
    selectedSliceId,
    selectedSliceIndex,
    sliceOptions,
    changePolicy,
  };
}

export function passengerCountsFromBooking(booking: BookingDetailDto): {
  adults: number;
  children: number;
  infants: number;
} {
  const snap = booking.flight_booking?.itinerary_snapshot;
  if (snap && typeof snap === "object" && Array.isArray((snap as { passengers?: unknown }).passengers)) {
    const pax = (snap as { passengers: { type?: string }[] }).passengers;
    let adults = 0;
    let children = 0;
    let infants = 0;
    for (const p of pax) {
      const t = (p.type ?? "adult").toLowerCase();
      if (t === "child") children += 1;
      else if (t === "infant_without_seat" || t === "infant") infants += 1;
      else adults += 1;
    }
    return { adults: Math.max(1, adults), children, infants };
  }

  const guest = booking.guest_data;
  if (guest && typeof guest === "object" && Array.isArray((guest as { passengers?: unknown }).passengers)) {
    const len = (guest as { passengers: unknown[] }).passengers.length;
    return { adults: Math.max(1, len), children: 0, infants: 0 };
  }

  return { adults: 1, children: 0, infants: 0 };
}

export function selectedSliceOption(
  ctx: OriginalBookingContext,
): FlightOrderChangeSliceOption | null {
  return ctx.sliceOptions.find((s) => s.slice_id === ctx.selectedSliceId) ?? null;
}
