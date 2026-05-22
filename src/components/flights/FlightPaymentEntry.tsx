"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CheckoutLoadingSkeleton } from "@/components/flights/FlightSkeletons";
import type { FlightCheckoutContactPrefill } from "@/components/flights/FlightCheckoutDuffel";

const FlightCheckoutDuffel = dynamic(
  () => import("@/components/flights/FlightCheckoutDuffel").then((m) => m.FlightCheckoutDuffel),
  {
    ssr: false,
    loading: () => <CheckoutLoadingSkeleton />,
  },
);

/**
 * Flight payment page: requires `?offer_id=off_…` from search or detail CTA.
 */
export function FlightPaymentEntry({
  contactPrefill = null,
}: {
  contactPrefill?: FlightCheckoutContactPrefill | null;
}) {
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offer_id")?.trim() ?? "";
  const searchSessionId = searchParams.get("search_session")?.trim() ?? null;

  if (!offerId) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="flex-grow pt-24 pb-12 container mx-auto px-4 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Flight checkout</h1>
          <p className="text-muted-foreground mb-6">
            Pick a flight first, then proceed to payment. An offer id is required in the URL.
          </p>
          <Link
            href="/flights"
            className="inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Search flights
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="flex-grow pt-12 pb-12 sm:px-4">
        <FlightCheckoutDuffel
          offerId={offerId}
          searchSessionId={searchSessionId}
          contactPrefill={contactPrefill}
        />
      </div>
    </div>
  );
}
