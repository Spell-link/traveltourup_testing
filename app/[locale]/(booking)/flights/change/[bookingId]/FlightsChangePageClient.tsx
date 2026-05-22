"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import FlightList from "@/components/flights/FlightList";
import { FlightChangeBreadcrumb } from "@/components/flights/FlightChangeBreadcrumb";
import { FlightChangeModeBanner } from "@/components/flights/change/FlightChangeModeBanner";
import { FlightChangeHubLoading } from "@/components/flights/FlightSkeletons";
import FlightsTab from "@/components/flights/FlightsTab";
import type { FlightFlowContext } from "@/lib/flights/flight-flow-context";
import type { OriginalBookingContext } from "@/lib/flights/flow-variant";
import { getFlightsChangePageLayout } from "@/lib/flights/flights-change-page-layout";
import { useFlightChangeHubData } from "@/lib/http/flight-change-swr";

type Props = { bookingId: string };

export default function FlightsChangePageClient({ bookingId }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations("Flights.change");
  const layout = getFlightsChangePageLayout(new URLSearchParams(searchParams.toString()));

  const preSlice = searchParams.get("slice_id");
  const { data, error, isLoading } = useFlightChangeHubData(bookingId, preSlice);

  const [originalBooking, setOriginalBooking] = useState<OriginalBookingContext | null>(null);

  const hubOriginalBooking = data?.originalBooking ?? null;
  const effectiveOriginalBooking = originalBooking ?? hubOriginalBooking;

  const updateSelectedSlice = useCallback(
    (sliceId: string) => {
      const base = effectiveOriginalBooking ?? hubOriginalBooking;
      if (!base) return;
      const idx = base.sliceOptions.findIndex((s) => s.slice_id === sliceId);
      setOriginalBooking({
        ...base,
        selectedSliceId: sliceId,
        selectedSliceIndex: Math.max(0, idx),
      });
    },
    [effectiveOriginalBooking, hubOriginalBooking],
  );

  const flowContext: FlightFlowContext | null = useMemo(() => {
    if (!effectiveOriginalBooking) return null;
    return {
      variant: "change-flight",
      bookingId,
      originalBooking: effectiveOriginalBooking,
    };
  }, [effectiveOriginalBooking, bookingId]);

  const slicePicker = useMemo(() => {
    if (!effectiveOriginalBooking || effectiveOriginalBooking.sliceOptions.length <= 1) return null;
    return (
      <div className="mb-4 space-y-2">
        <p className="text-sm font-medium text-foreground">{t("selectLeg")}</p>
        {effectiveOriginalBooking.sliceOptions.map((slice) => (
          <button
            key={slice.slice_id}
            type="button"
            onClick={() => updateSelectedSlice(slice.slice_id)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
              effectiveOriginalBooking.selectedSliceId === slice.slice_id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <span className="font-medium">{slice.label}</span>
          </button>
        ))}
      </div>
    );
  }, [effectiveOriginalBooking, t, updateSelectedSlice]);

  if (isLoading) {
    return <FlightChangeHubLoading />;
  }

  const loadError =
    error?.message ??
    (data?.booking.status !== "confirmed" || !data.booking.flight_booking
      ? t("notChangeable")
      : !data.ctx.changeable || !data.ctx.change_allowed
        ? data.ctx.change_policy_message || t("notChangeable")
        : !effectiveOriginalBooking
          ? t("notChangeable")
          : null);

  if (loadError || !effectiveOriginalBooking || !flowContext) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-destructive">{loadError ?? t("loadFailed")}</p>
      </div>
    );
  }

  if (layout === "results") {
    return <FlightList flowContext={flowContext} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <FlightChangeBreadcrumb
        bookingId={bookingId}
        bookingRefNo={effectiveOriginalBooking.bookingRefNo}
        step="change"
      />
      <h1 className="text-2xl font-bold text-foreground">
        {t("pageTitle", { ref: effectiveOriginalBooking.bookingRefNo })}
      </h1>
      <div id="flight-change-search" className="mt-6 scroll-mt-16">
        <FlightChangeModeBanner
          bookingRefNo={effectiveOriginalBooking.bookingRefNo}
          bookingId={bookingId}
        />
        {slicePicker}
        <div>
          <FlightsTab flowVariant="change-flight" originalBooking={effectiveOriginalBooking} />
        </div>
      </div>
    </div>
  );
}
