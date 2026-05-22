"use client";

import React, { Suspense, useEffect } from "react";
import { FlightPaymentEntry } from "@/components/flights/FlightPaymentEntry";
import type { FlightCheckoutContactPrefill } from "@/components/flights/FlightCheckoutDuffel";
import { FlightCheckoutPageSkeleton } from "@/components/flights/FlightSkeletons";

/**
 * Booking-flow payment shell. Flights use Duffel Payments (`?offer_id=`).
 */
const Payment = ({
  contactPrefill = null,
}: {
  contactPrefill?: FlightCheckoutContactPrefill | null;
}): React.ReactElement => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Suspense fallback={<FlightCheckoutPageSkeleton />}>
      <FlightPaymentEntry contactPrefill={contactPrefill} />
    </Suspense>
  );
};

export default Payment;
