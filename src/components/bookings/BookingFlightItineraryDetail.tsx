"use client";

import { FlightItineraryDetailBody } from "@/components/flights/FlightItineraryDetailBody";
import { bookingSnapshotToFlightDisplay } from "@/lib/flights/booking-snapshot-display";
import { parseDuffelOrderDisplay } from "@/lib/flights/duffel-order-display";
import { ItineraryFromSnapshot } from "@/components/bookings/ItineraryFromSnapshot";

type Props = {
  itinerarySnapshot: unknown;
  orderRaw?: unknown;
  totalAmount: string | number;
  currency: string;
};

/**
 * Flight itinerary for booking detail — prefers Duffel `order_raw` fields when present.
 */
export function BookingFlightItineraryDetail({
  itinerarySnapshot,
  orderRaw,
  totalAmount,
  currency,
}: Props) {
  const duffel = orderRaw ? parseDuffelOrderDisplay(orderRaw, totalAmount, currency) : null;

  if (duffel) {
    const seg = duffel.slices[0]?.segments[0];
    const headerSubtitle = seg
      ? [seg.fareBrandName ?? "Economy", seg.marketingCarrierName].filter(Boolean).join(" • ")
      : undefined;

    return (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Journey details
        </h2>
        <FlightItineraryDetailBody
          flight={duffel.flight}
          totalAmount={duffel.billing.totalAmount}
          totalCurrency={duffel.billing.currency}
          bookingMode
          headerSubtitle={headerSubtitle}
          journeyMetaLine={seg?.metaLine}
          changePolicyText={duffel.policies.changeText}
          refundPolicyText={duffel.policies.refundText}
        />
      </section>
    );
  }

  const mapped = bookingSnapshotToFlightDisplay(itinerarySnapshot, totalAmount, currency);

  if (!mapped) {
    return (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Journey details
        </h2>
        <ItineraryFromSnapshot snapshot={itinerarySnapshot} />
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        Journey details
      </h2>
      <FlightItineraryDetailBody
        flight={mapped.flight}
        totalAmount={totalAmount}
        totalCurrency={currency}
        bookingMode
      />
    </section>
  );
}
