"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { buildFlightChangeEditSearchSummary } from "@/lib/flights/flight-change-edit-search-summary";
import type { OriginalBookingContext } from "@/lib/flights/flow-variant";
import { flightChangeSearchFromUrl, changeSearchMatchesSession } from "@/lib/flights/flights-change-page-layout";
import {
  orderChangeOffersToListDisplay,
  type FlightChangeListDisplay,
} from "@/lib/flights/order-change-list-display";
import {
  patchFlightChangeSession,
  readFlightChangeSession,
  sortChangeOffersByCost,
  writeFlightChangeSession,
} from "@/lib/flights/flight-change-session";
import { ApiRequestError } from "@/lib/http/api-client";
import { postFlightOrderChangeQuote } from "@/lib/http/flights.client";

export function useFlightChangeResults(
  bookingId: string,
  originalBooking: OriginalBookingContext,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && Boolean(bookingId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const locale = useLocale();
  const tResults = useTranslations("Flights.results");
  const tChange = useTranslations("Flights.change");
  const ft = useTranslations("Flights.tab");

  const hasFetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [changeId, setChangeId] = useState("");
  const [flights, setFlights] = useState<FlightChangeListDisplay[]>([]);

  const stableKey = useMemo(() => queryString, [queryString]);

  const params = useMemo(
    () => flightChangeSearchFromUrl(new URLSearchParams(queryString)),
    [queryString],
  );

  const editSearchSummary = useMemo(() => {
    const base = buildFlightChangeEditSearchSummary(
      queryString,
      locale,
      {
        modifyingHeadline: () =>
          tChange("modifyingBooking", { ref: originalBooking.bookingRefNo }),
        route: (v) => tResults("editSearchRouteOneWay", v),
        dates: (v) => tResults("editSearchDatesOneWay", v),
        passengers: (v) => tResults("editSearchPassengers", v),
      },
      (key) => ft(key),
    );
    if (!base) return null;
    return {
      headline: tChange("modifyingBooking", { ref: originalBooking.bookingRefNo }),
      lines: base.lines,
    };
  }, [queryString, locale, tChange, tResults, ft, originalBooking.bookingRefNo]);

  const routeTitle = params
    ? tChange("resultsTitle", { route: `${params.origin} → ${params.destination}` })
    : tChange("resultsTitleFallback");

  const loadOffers = useCallback(async () => {
    if (!params) {
      setLoading(false);
      setFetchError(null);
      setFlights([]);
      return;
    }

    const session = readFlightChangeSession(bookingId);
    const urlChangeId = searchParams.get("change_id")?.trim() ?? "";
    const quoteExpired =
      session?.quoteExpiresAt != null &&
      new Date(session.quoteExpiresAt).getTime() <= Date.now();

    if (
      session?.offers?.length &&
      session.changeId &&
      changeSearchMatchesSession(params, session) &&
      !quoteExpired &&
      (!urlChangeId || urlChangeId === session.changeId)
    ) {
      const rows = orderChangeOffersToListDisplay(sortChangeOffersByCost(session.offers));
      setChangeId(session.changeId);
      setFlights(rows);
      setLoading(false);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const cabin = params.cabin_class as "economy" | "premium_economy" | "business" | "first";
      const result = await postFlightOrderChangeQuote(bookingId, {
        selected_slice_id: params.slice_id,
        departure_date: params.departure_date,
        origin: params.origin,
        destination: params.destination,
        cabin_class: cabin,
      });
      const sorted = sortChangeOffersByCost(result.offers);
      const rows = orderChangeOffersToListDisplay(sorted);
      setChangeId(result.id);
      setFlights(rows);

      const paxTotal =
        (parseInt(params.adults, 10) || 1) +
        (parseInt(params.children, 10) || 0) +
        (parseInt(params.infants, 10) || 0);

      writeFlightChangeSession(bookingId, {
        selectedSliceId: params.slice_id,
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departure_date,
        cabinClass: params.cabin_class,
        changeId: result.id,
        offers: sorted,
        quoteExpiresAt: result.quote_expires_at,
        bookingRefNo: originalBooking.bookingRefNo,
        beforeChangeAmount: String(originalBooking.totalAmount),
        beforeChangeCurrency: originalBooking.currency,
        selectedSliceIndex: originalBooking.selectedSliceIndex,
        searchSummary: {
          route: `${params.origin} → ${params.destination}`,
          dateLabel: params.departure_date,
          passengerCount: paxTotal,
        },
      });
    } catch (e) {
      setFetchError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : tChange("searchFailed"),
      );
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId, params, originalBooking, tChange, searchParams]);

  useEffect(() => {
    if (!enabled) return;
    hasFetchedRef.current = false;
  }, [stableKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void loadOffers();
  }, [loadOffers, enabled]);

  const pushSortToUrl = useCallback(
    (id: string) => {
      const p = new URLSearchParams(queryString);
      p.set("sort", id);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [queryString, pathname, router],
  );

  const detailHref = useCallback(
    (offerId: string) => {
      const p = new URLSearchParams();
      if (changeId) p.set("change_id", changeId);
      const qs = p.toString();
      return `/flights/change/${encodeURIComponent(bookingId)}/${encodeURIComponent(offerId)}${qs ? `?${qs}` : ""}`;
    },
    [bookingId, changeId],
  );

  const onSelectOffer = useCallback(
    (offerId: string) => {
      patchFlightChangeSession(bookingId, { selectedOfferId: offerId, changeId });
    },
    [bookingId, changeId],
  );

  return {
    loading,
    fetchError,
    flights,
    changeId,
    params,
    routeTitle,
    editSearchSummary,
    pushSortToUrl,
    detailHref,
    onSelectOffer,
  };
}
