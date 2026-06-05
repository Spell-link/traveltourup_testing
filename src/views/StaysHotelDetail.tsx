"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { ReviewsSection } from "@/components/shared/ReviewsSection";
import { HotelDetailContent } from "@/components/hotels/HotelDetailContent";
import { BookingSidebar } from "@/components/shared/BookingSidebar";
import type { HotelRoom } from "@/data/mock-hotels";
import type { MockHotel } from "@/data/mock-hotels";
import type { StaysRatesPayload, StaysQuoteDto } from "@/lib/api/stays-dto";
import { staysRateToHotelRoom } from "@/lib/stays/stays-ui-map";
import { getStaysRates, postStaysQuote } from "@/lib/http/stays.client";
import { buildStaysQuoteSessionContext } from "@/lib/stays/stays-quote-context";
import {
  formatQuoteExpiryCountdown,
  isStaysQuoteExpired,
  quoteToSidebar,
  writeStaysQuoteSession,
} from "@/lib/stays/stays-quote-session";
import { StaysHotelDetailLoading } from "@/components/hotels/StaysHotelDetailSkeleton";
import { useBookingBreadcrumbHotelTitle } from "@/components/shared/BookingBreadcrumbHotelContext";
import { buildHotelTripSnapshotFromRates, formatRouteLabel } from "@/lib/journey/journey-trip-snapshot";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";
import { trackClientJourneyEvent } from "@/lib/http/journey.client";

type SearchContext = {
  check_in_date?: string;
  check_out_date?: string;
  rooms?: number;
};

function formatRatesLoadError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("not found") ||
    m.includes("gone") ||
    m.includes("expired")
  ) {
    return "This listing is no longer available, or your search session expired. Run a new hotel search and open the property again from the updated results.";
  }
  return message;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const d = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, d);
}

/** Shorter listing title: drop trailing "Formerly …" often present in Duffel supplier names. */
function formatStaysPropertyDisplayName(name: string): string {
  const trimmed = name.replace(/\s+Formerly\s+.+$/i, "").trim();
  return trimmed || name.trim();
}

function formatStaysLocationLine(
  loc: StaysRatesPayload["accommodation"]["location"],
): string {
  const city = loc.city?.trim();
  const cc = loc.country_code?.trim()?.toUpperCase();
  if (!city && !cc) return "—";
  let country = "";
  if (cc) {
    if (cc === "AE") country = "UAE";
    else if (cc === "GB") country = "UK";
    else {
      try {
        country = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
      } catch {
        country = cc;
      }
    }
  }
  if (city && country) return `${city}, ${country}`;
  return city || country || "—";
}

function loadSearchContext(): SearchContext {
  try {
    const raw = sessionStorage.getItem("ttu_stays_search");
    if (!raw) return {};
    const j = JSON.parse(raw) as { context?: SearchContext };
    return j?.context ?? {};
  } catch {
    return {};
  }
}

/**
 * Duffel Stays four-step flow: search → fetch_all_rates (this page) → quote → book.
 * Optional product extensions (not wired in UI until spec’d): negotiated_rate_ids on search;
 * loyalty programme ids on booking (Duffel “Booking with Loyalty”); cancellation_timeline on
 * rates/quotes for “Displaying the Cancellation Timeline”; card payments need `payment` + 3DS.
 */
function payAtHotelFromRates(rates: StaysRatesPayload["rates"]): boolean {
  return rates.some((r) => {
    const p = (r.payment_type ?? "").toLowerCase();
    return p.includes("pay_at") || p.includes("property") || p.includes("hotel");
  });
}

/** Full refund window per [cancellation timeline](https://duffel.com/docs/guides/displaying-the-cancellation-timeline). */
function rateHasFullRefundMilestone(rate: StaysRatesPayload["rates"][number]): boolean {
  return rate.cancellation_timeline.some((t) => t.refund_amount === rate.total_amount);
}

function ratesPayloadToMockHotel(payload: StaysRatesPayload, ctx: SearchContext): MockHotel {
  const a = payload.accommodation;
  const line = [
    a.location.line_one,
    a.location.city,
    a.location.country_code,
  ]
    .filter(Boolean)
    .join(", ");
  const lat = a.location.latitude ?? 0;
  const lng = a.location.longitude ?? 0;
  const minRate = payload.rates[0];
  const price = minRate ? Number.parseFloat(minRate.total_amount) : 0;

  return {
    id: payload.search_result_id,
    name: a.name,
    rating: a.review_score ?? 8,
    reviews: 0,
    stars: a.rating ?? 4,
    address: line || "—",
    area: a.location.city ?? "—",
    distanceFromCenter: "—",
    distanceFromAirport: "—",
    description: a.description ?? "",
    price: Number.isFinite(price) ? price : 0,
    originalPrice: Number.isFinite(price) ? price : 0,
    discount: 0,
    taxes: 0,
    totalPrice: Number.isFinite(price) ? price : 0,
    currency: minRate?.total_currency ?? "USD",
    images: a.photos.length ? a.photos : [],
    amenities: a.amenities.map((x) => x.type),
    mealPlan: "",
    freeCancellation: payload.rates.some(rateHasFullRefundMilestone),
    payAtHotel: payAtHotelFromRates(payload.rates),
    instantConfirmation: false,
    roomsLeft: 9,
    propertyType: "hotel",
    tags: ["Stays"],
    fromDuffelStays: true,
    guestRating: a.review_score ?? 8,
    locationScore: 8,
    cleanlinessScore: 8,
    serviceScore: 8,
    valueScore: 8,
    deals: [],
    lat,
    lng,
    rooms: [],
  };
}

export interface StaysHotelDetailProps {
  searchResultId: string;
}

export default function StaysHotelDetail({ searchResultId }: StaysHotelDetailProps) {
  const { setHotelDetailCrumbLabel } = useBookingBreadcrumbHotelTitle();
  const [ctx] = useState<SearchContext>(() => loadSearchContext());
  const [payload, setPayload] = useState<StaysRatesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteInlineError, setQuoteInlineError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRooms, setSelectedRooms] = useState<HotelRoom[]>([]);
  const [quote, setQuote] = useState<StaysQuoteDto | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteExpiryLabel, setQuoteExpiryLabel] = useState<string | null>(null);
  const enrichSentRef = useRef(false);

  const checkIn = ctx.check_in_date ?? new Date().toISOString().slice(0, 10);
  const checkOut = ctx.check_out_date ?? new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  const nights = nightsBetween(checkIn, checkOut);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStaysRates(searchResultId);
        if (cancelled) return;
        setPayload(data);
      } catch (e) {
        if (!cancelled) {
          const raw = e instanceof Error ? e.message : "Failed to load hotel";
          setError(formatRatesLoadError(raw));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchResultId]);

  useEffect(() => {
    if (!payload || enrichSentRef.current) return;
    enrichSentRef.current = true;

    const snap = readStaysSearchFormSnapshot();
    const destLabel =
      snap?.destination?.kind === "popular"
        ? `${snap.destination.name}, ${snap.destination.country}`
        : snap?.destination?.kind === "place"
          ? snap.destination.city_name || snap.destination.name
          : undefined;

    const tripSnapshot = buildHotelTripSnapshotFromRates(payload, {
      productRef: searchResultId,
      checkIn: snap?.check_in_date ?? checkIn,
      checkOut: snap?.check_out_date ?? checkOut,
      adults: snap?.adults,
      children: snap?.children,
      rooms: snap?.rooms,
      destinationLabel: destLabel,
      detailPath: `/hotels/${encodeURIComponent(searchResultId)}`,
    });

    trackClientJourneyEvent({
      event_type: "product.enriched",
      product_type: "hotel",
      product_ref: searchResultId,
      stage: "viewed",
      preserve_stage: true,
      client_event_id: crypto.randomUUID(),
      title: tripSnapshot.hotel_name ?? undefined,
      subtitle: formatRouteLabel(tripSnapshot),
      price_amount: tripSnapshot.price_amount,
      price_currency: tripSnapshot.price_currency,
      trip_snapshot: tripSnapshot,
    });
  }, [payload, searchResultId, checkIn, checkOut]);

  const hotel = useMemo(() => (payload ? ratesPayloadToMockHotel(payload, ctx) : null), [payload, ctx]);

  useEffect(() => {
    if (!hotel?.name || payload?.search_result_id !== searchResultId) return;
    setHotelDetailCrumbLabel(hotel.name);
    return () => setHotelDetailCrumbLabel(null);
  }, [hotel?.name, payload?.search_result_id, searchResultId, setHotelDetailCrumbLabel]);

  const rooms: HotelRoom[] = useMemo(() => {
    if (!payload) return [];
    return payload.rates.map((r) => staysRateToHotelRoom(r, nights));
  }, [payload, nights]);

  const requestQuote = useCallback(async (rateId: string) => {
    setQuoteLoading(true);
    setQuote(null);
    setQuoteInlineError(null);
    try {
      const data = await postStaysQuote({ rate_id: rateId });
      setQuote(data);
      const room = rooms.find((r) => r.id === rateId);
      writeStaysQuoteSession({
        quote: data,
        checkIn,
        checkOut,
        searchResultId,
        context: buildStaysQuoteSessionContext({
          hotelName: hotel?.name ?? "",
          hotelAddress: hotel?.address,
          room: room ?? null,
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Quote failed";
      setQuoteInlineError(
        /expired|invalid|gone|not found/i.test(msg)
          ? `${msg} If the quote timed out, pick the rate again.`
          : msg,
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [checkIn, checkOut, searchResultId, rooms, hotel?.name, hotel?.address]);

  const handleAddRoom = useCallback(
    (room: HotelRoom) => {
      setSelectedRooms([room]);
      void requestQuote(room.id);
    },
    [requestQuote],
  );

  const handleRemoveRoom = useCallback((room: HotelRoom) => {
    setSelectedRooms((prev) => prev.filter((r) => r.id !== room.id));
    setQuote(null);
    setQuoteInlineError(null);
    setQuoteExpiryLabel(null);
  }, []);

  useEffect(() => {
    if (!quote?.expires_at) {
      setQuoteExpiryLabel(null);
      return;
    }
    const tick = () => {
      if (isStaysQuoteExpired(quote.expires_at)) {
        setQuote(null);
        setQuoteInlineError(
          "This price lock has expired. Select the room again to refresh the rate before checkout.",
        );
        setQuoteExpiryLabel(null);
        return;
      }
      setQuoteExpiryLabel(formatQuoteExpiryCountdown(quote.expires_at));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [quote?.expires_at, quote?.quote_id]);

  if (loading) {
    return <StaysHotelDetailLoading />;
  }

  if (error && !payload) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/hotels" className="font-semibold text-primary underline">
            Back to browse
          </Link>
          <Link href="/hotels?stays_results=1" className="font-semibold text-primary underline">
            View last results
          </Link>
        </div>
      </div>
    );
  }

  if (!hotel || !payload) return null;

  const bookingItem = {
    id: quote?.quote_id ?? hotel.id,
    price: quote?.total_amount ? Number.parseFloat(quote.total_amount) : hotel.totalPrice,
    currency: quote?.total_currency ?? hotel.currency,
    name: hotel.name,
    address: hotel.address,
    roomName: selectedRooms[0]?.name,
  };

  return (
    <DetailPageLayout
      mainContent={
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {quoteInlineError && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {quoteInlineError}
            </div>
          )}
          {quote && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="font-semibold text-foreground">Price locked for checkout</p>
              {quoteExpiryLabel ? (
                <p className="text-muted-foreground">
                  Complete payment within <span className="font-mono font-medium">{quoteExpiryLabel}</span> — Duffel
                  rates expire quickly.
                </p>
              ) : quote.expires_at ? (
                <p className="text-muted-foreground">
                  Quote expires: {new Date(quote.expires_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          )}
          {quoteLoading && <p className="text-sm text-muted-foreground mb-2">Getting quote…</p>}
          <HotelDetailContent
            hotel={{ ...hotel, rooms }}
            selectedRooms={selectedRooms}
            onAddRoom={handleAddRoom}
            onRemoveRoom={handleRemoveRoom}
            roomSelectionMode="single"
            showDuffelRateHints
          />
        </>
      }
      sidebarContent={
        <BookingSidebar
          item={bookingItem}
          type="hotel"
          selectedRooms={selectedRooms}
          availableRooms={rooms}
          requiresStaysQuote
          staysQuoteLoading={quoteLoading}
          staysQuote={
            quote
              ? quoteToSidebar(
                  writeStaysQuoteSession({
                    quote,
                    checkIn,
                    checkOut,
                    searchResultId,
                    context: buildStaysQuoteSessionContext({
                      hotelName: hotel.name,
                      hotelAddress: hotel.address,
                      room: selectedRooms[0] ?? null,
                    }),
                  }),
                )
              : null
          }
        />
      }
      bottomContent={
        <ReviewsSection
          itemId={hotel.id}
          rating={hotel.stars}
          itemType="hotel"
          staysProviderSummary={{
            displayName: formatStaysPropertyDisplayName(payload.accommodation.name),
            starRating: payload.accommodation.rating ?? hotel.stars,
            guestScore:
              payload.accommodation.review_score != null
                ? payload.accommodation.review_score
                : null,
            locationLine: formatStaysLocationLine(payload.accommodation.location),
          }}
        />
      }
    />
  );
}
