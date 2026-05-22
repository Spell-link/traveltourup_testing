"use client";

import { FlightChangePaymentEntry } from "@/components/flights/FlightChangePaymentEntry";

type Props = { bookingId: string };

export default function FlightChangePaymentPageClient({ bookingId }: Props) {
  return <FlightChangePaymentEntry bookingId={bookingId} />;
}
