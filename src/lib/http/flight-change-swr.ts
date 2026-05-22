"use client";

import useSWR from "swr";
import { buildOriginalBookingContext } from "@/lib/flights/build-original-booking-context";
import type { OriginalBookingContext } from "@/lib/flights/flow-variant";
import { getBooking } from "@/lib/http/bookings.client";
import {
  getFlightOrderChangeContext,
  type FlightOrderChangeContextResult,
} from "@/lib/http/flights.client";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";

export type FlightChangeHubData = {
  booking: BookingDetailDto;
  ctx: FlightOrderChangeContextResult;
  originalBooking: OriginalBookingContext | null;
};

export function flightChangeHubKey(bookingId: string, selectedSliceId?: string | null): string {
  return `flight-change-hub:${bookingId}:${selectedSliceId ?? ""}`;
}

async function fetchFlightChangeHub(
  bookingId: string,
  selectedSliceId?: string | null,
): Promise<FlightChangeHubData> {
  const [booking, ctx] = await Promise.all([
    getBooking(bookingId),
    getFlightOrderChangeContext(bookingId),
  ]);
  const originalBooking = buildOriginalBookingContext({
    booking,
    changeContext: ctx,
    selectedSliceId: selectedSliceId ?? undefined,
  });
  return { booking, ctx, originalBooking };
}

const hubOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
} as const;

export function useFlightChangeHubData(bookingId: string, selectedSliceId?: string | null) {
  return useSWR<FlightChangeHubData, Error>(
    bookingId ? flightChangeHubKey(bookingId, selectedSliceId) : null,
    () => fetchFlightChangeHub(bookingId, selectedSliceId),
    hubOptions,
  );
}
