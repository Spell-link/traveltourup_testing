"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { HotelCheckoutLoadingSkeleton } from "@/components/hotels/HotelCheckoutLoadingSkeleton";
import { duffelQuoteIdSchema } from "@/lib/validations/checkout-payment.schema";

const HotelCheckoutDuffel = dynamic(
  () => import("@/components/hotels/HotelCheckoutDuffel").then((m) => m.HotelCheckoutDuffel),
  {
    ssr: false,
    loading: () => <HotelCheckoutLoadingSkeleton />,
  },
);

/**
 * Hotel checkout: requires `?quote_id=quo_…` (and optional session `ttu_stays_quote`).
 */
export function StaysPaymentEntry() {
  const searchParams = useSearchParams();
  const rawQuoteId = searchParams.get("quote_id")?.trim() ?? "";
  const quoteParsed = duffelQuoteIdSchema.safeParse(rawQuoteId);
  const quoteId = quoteParsed.success ? quoteParsed.data : "";

  if (!quoteId) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="flex-grow pt-24 pb-12 container mx-auto px-4 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Hotel checkout</h1>
          <p className="text-muted-foreground mb-6">
            Select a room and get a quote first, then proceed to payment. A valid quote id is required in the URL.
          </p>
          <Link
            href="/hotels"
            className="inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Search hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="flex-grow pt-12 pb-12 sm:px-4">
        <HotelCheckoutDuffel quoteId={quoteId} />
      </div>
    </div>
  );
}
