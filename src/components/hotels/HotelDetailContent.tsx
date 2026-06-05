"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Star,
  Building2,
  UtensilsCrossed,
  XCircle,
  CheckCircle,
  BedDouble,
  Wifi,
  Waves,
  Dumbbell,
  Car,
  Coffee,
  Utensils,
  Wine,
  Wind,
  Briefcase,
  Shirt,
} from "lucide-react";
import type { MockHotel, HotelRoom } from "@/data/mock-hotels";
import { getDefaultRooms } from "@/data/mock-hotels";
import { DetailKeyGrid } from "@/components/shared/DetailKeyGrid";
import { DetailFeaturesGrid } from "@/components/shared/DetailFeaturesGrid";
import { ImageGallery } from "@/components/shared/ImageGallery";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const LeafletMap = dynamic(() => import("@/components/shared/LeafLeftMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full animate-pulse rounded-lg border border-border bg-muted" />
  ),
});

const AMENITY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-4 h-4" />, label: "Wi-Fi" },
  pool: { icon: <Waves className="w-4 h-4" />, label: "Pool" },
  spa: { icon: <Waves className="w-4 h-4" />, label: "Spa" },
  gym: { icon: <Dumbbell className="w-4 h-4" />, label: "Gym" },
  parking: { icon: <Car className="w-4 h-4" />, label: "Parking" },
  breakfast: { icon: <Coffee className="w-4 h-4" />, label: "Breakfast" },
  restaurant: { icon: <Utensils className="w-4 h-4" />, label: "Restaurant" },
  bar: { icon: <Wine className="w-4 h-4" />, label: "Bar" },
  ac: { icon: <Wind className="w-4 h-4" />, label: "Air Conditioning" },
  business: { icon: <Briefcase className="w-4 h-4" />, label: "Business Center" },
  laundry: { icon: <Shirt className="w-4 h-4" />, label: "Laundry" },
  "airport-shuttle": { icon: <Car className="w-4 h-4" />, label: "Airport Shuttle" },
};

import { AvailableRooms } from "./AvailableRooms";
import { HOTEL_AVAILABLE_ROOMS_SECTION_ID } from "@/lib/hotels/scroll-to-available-rooms";

/** Countdown before redirect to the hotels listing (30 minutes). */
const HOTEL_DETAIL_REDIRECT_SECONDS = 30 * 60;

function formatSessionCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatUtcBeforeLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export interface HotelDetailContentProps {
  hotel: MockHotel;
  selectedRooms: HotelRoom[];
  onAddRoom: (room: HotelRoom) => void;
  onRemoveRoom: (room: HotelRoom) => void;
  /** Duffel Stays: single rate selection. Mock hotels: multi-quantity. */
  roomSelectionMode?: "single" | "multi";
  /** Show Duffel-specific rate copy and totals on room cards. */
  showDuffelRateHints?: boolean;
}

export function HotelDetailContent({
  hotel,
  selectedRooms,
  onAddRoom,
  onRemoveRoom,
  roomSelectionMode = "multi",
  showDuffelRateHints = false,
}: HotelDetailContentProps) {
  const th = useTranslations("Hotels.detail");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [redirectSecondsLeft, setRedirectSecondsLeft] = useState(HOTEL_DETAIL_REDIRECT_SECONDS);

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    id = setInterval(() => {
      setRedirectSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (redirectSecondsLeft !== 0) return;
    router.push("/hotels");
  }, [redirectSecondsLeft, router]);

  const cancellationSummary = useMemo(() => {
    if (!hotel.fromDuffelStays) {
      return hotel.freeCancellation ? tc("freeCancellation") : th("cancellationNonRefundable");
    }
    const r = selectedRooms[0];
    if (!r?.cancellationTimeline?.length) {
      return hotel.freeCancellation
        ? th("cancellationRefundHint")
        : th("cancellationRateCard");
    }
    const t = r.cancellationTimeline[0];
    const refundAmt = Number.parseFloat(t.refund_amount);
    const refundCur = (t.currency ?? hotel.currency ?? "USD").toUpperCase();
    const refundDisp = Number.isFinite(refundAmt)
      ? formatPrice(refundAmt, refundCur, locale)
      : `${refundCur} ${t.refund_amount}`;
    return `Until ${formatUtcBeforeLocal(t.before)}: refund ${refundDisp} (see rate for full timeline)`;
  }, [
    hotel.freeCancellation,
    hotel.fromDuffelStays,
    hotel.currency,
    selectedRooms,
    th,
    tc,
    formatPrice,
    locale,
  ]);

  const keyDetails = [
    {
      icon: <MapPin className="w-5 h-5" />,
      label: th("labelLocation"),
      value: hotel.address,
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: th("labelRating"),
      value: th("ratingReviews", { rating: hotel.rating, count: hotel.reviews }),
    },
    {
      icon: <Building2 className="w-5 h-5" />,
      label: th("labelPropertyType"),
      value: hotel.propertyType,
    },
    {
      icon: <UtensilsCrossed className="w-5 h-5" />,
      label: th("labelMealPlan"),
      value: hotel.mealPlan,
    },
    {
      icon: hotel.freeCancellation ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      ),
      label: th("labelCancellation"),
      value: cancellationSummary,
    },
    {
      icon: <BedDouble className="w-5 h-5" />,
      label: th("labelRooms"),
      value: th("roomsLeftCount", { count: hotel.roomsLeft }),
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: th("labelDistance"),
      value: `${hotel.distanceFromCenter} ${th("fromCenter")} • ${hotel.distanceFromAirport} ${th("fromAirport")}`,
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      label: th("labelConfirmation"),
      value: hotel.instantConfirmation ? th("confirmationInstant") : th("confirmationWithin24"),
    },
    {
      icon: <Building2 className="w-5 h-5" />,
      label: th("labelArea"),
      value: hotel.area,
    },
  ];

  const features = hotel.amenities.map((a) => ({
    icon: AMENITY_ICONS[a]?.icon ?? <CheckCircle className="w-4 h-4" />,
    label: AMENITY_ICONS[a]?.label ?? a,
  }));

  const countdownUrgent = redirectSecondsLeft > 0 && redirectSecondsLeft < 120;
  const countdownBannerBorder = countdownUrgent
    ? "border-red-500/40"
    : "border-amber-500/40";
  const countdownBannerBg = countdownUrgent ? "bg-red-500/10" : "bg-amber-500/10";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-row justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {hotel.name}
        </h1>
          <p
            className={`mb-4 rounded-lg border px-4 py-2 text-sm text-foreground tabular-nums ${countdownBannerBorder} ${countdownBannerBg}`}
          >
            {th("redirectToHotelsCountdown", {
              time: formatSessionCountdown(redirectSecondsLeft),
            })}
          </p>
        </div>
       
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">
            {hotel.area} • {hotel.propertyType}
          </span>
          <span className="px-3 py-1 rounded-lg bg-amber-400 text-amber-950 font-bold text-sm">
            {hotel.mealPlan}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{hotel.address}</span>
        </div>
      </div>

      {/* Image gallery */}
      <ImageGallery images={hotel.images ?? []} alt={hotel.name} />

      {/* Key details grid */}
      <div>
        <DetailKeyGrid items={keyDetails} columns={3} />
      </div>

      {/* About */}
      <div className="pt-8 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {th("aboutHotelHeading", { name: hotel.name })}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {hotel.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>
            {hotel.distanceFromCenter} {th("fromCenter")}
          </span>
          <span>•</span>
          <span>
            {hotel.distanceFromAirport} {th("fromAirport")}
          </span>
        </div>
      </div>

      {/* Available Rooms */}
      <section
        id={HOTEL_AVAILABLE_ROOMS_SECTION_ID}
        className="scroll-mt-24 pt-8 border-t border-border"
        aria-labelledby="hotel-available-rooms-heading"
      >
        <AvailableRooms
          rooms={hotel.rooms ?? getDefaultRooms(hotel)}
          currency={hotel.currency}
          selectedRooms={selectedRooms}
          onAddRoom={onAddRoom}
          onRemoveRoom={onRemoveRoom}
          selectionMode={roomSelectionMode}
          showDuffelRateHints={showDuffelRateHints}
          locationLabel={hotel.area || hotel.address}
          hotelGuestRating={hotel.guestRating ?? hotel.rating}
        />
      </section>

      {/* Amenities / Features */}
      <DetailFeaturesGrid
        title={th("amenitiesSectionTitle")}
        description={th("amenitiesSectionDescription")}
        features={features}
      />

      {/* Deals */}
      {hotel.deals && hotel.deals.length > 0 && (
        <div className="pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">{th("sectionDeals")}</h2>
          <div className="flex flex-wrap gap-2">
            {hotel.deals.map((deal, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  deal.highlight
                    ? "bg-success/20 text-success"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {deal.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      {hotel.lat != null && hotel.lng != null && (
        <div className="pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">{th("aboutLocationTitle")}</h2>
          <div className="rounded-xl overflow-hidden border border-border">
            <LeafletMap
              locations={[{ lat: hotel.lat, lng: hotel.lng, name: hotel.name }]}
              zoom={14}
              height="280px"
            />
          </div>
        </div>
      )}
    </div>
  );
}
