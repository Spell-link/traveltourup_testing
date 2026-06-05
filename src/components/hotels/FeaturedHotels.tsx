// @ts-nocheck - Phase 1: Swiper types; full typing in Phase 3
"use client";
import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import { shouldUnoptimizeStaysSupplierImage } from "@/lib/images/stays-supplier-image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export interface FeaturedHotel {
  id: number;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: string;
  image: string | { src: string };
  facilities: string[];
  originalPrice?: number;
  /** When set, overrides `/hotels/{id}` for Duffel Stays deep links. */
  actionHref?: string;
}

export interface FeaturedHotelsProps {
  hotels?: FeaturedHotel[];
  featuredAd?: { image?: string | { src: string } };
  bgColor?: string;
  /** When true, the slider shows placeholder tiles (same layout as flight featured skeleton). */
  loading?: boolean;
  mainPading?: string;
}

function HotelCardSkeletonTile() {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm bg-card border border-border/60 h-full flex flex-col"
      aria-hidden
    >
      <div className="relative h-56 bg-muted animate-pulse rounded-t-xl" />
      <div className="p-4 flex-1 flex flex-col">
        <div className="h-5 w-3/4 max-w-[200px] rounded-md bg-muted animate-pulse mb-2" />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded-sm bg-muted/80 animate-pulse shrink-0" />
          <div className="h-4 w-32 rounded-md bg-muted/80 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="h-3 w-14 rounded bg-muted/80 animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted/80 animate-pulse" />
          <div className="h-3 w-12 rounded bg-muted/80 animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
          <div className="space-y-1">
            <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted/80 animate-pulse" />
          </div>
          <div className="h-9 w-[88px] rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const FeaturedHotels = ({
  hotels = [],
  featuredAd = {},
  bgColor = "bg-muted",
  loading = false,
  mainPading = "py-10",
}: FeaturedHotelsProps) => {
  const t = useTranslations("Featured");
  const tCommon = useTranslations("Common");
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [swiperInstance, setSwiperInstance] = useState(null);

  // Initialize navigation after refs are set
  useEffect(() => {
    if (swiperInstance && prevRef.current && nextRef.current) {
      const nav = swiperInstance.params?.navigation;
      if (!nav || typeof nav !== "object") return;

      nav.prevEl = prevRef.current;
      nav.nextEl = nextRef.current;
      swiperInstance.navigation.destroy();
      swiperInstance.navigation.init();
      swiperInstance.navigation.update();
    }
  }, [swiperInstance]);

  // If no hotels data (and not loading), show empty state
  if (!loading && (!hotels || hotels.length === 0)) {
    return (
      <section className={`py-8  ${bgColor}`}>
        <div className="container mx-auto ">
          <div className="py-12">
            <SectionHeading
              title={t("hotelsEmptyTitle")}
              subtitle={t("hotelsEmptySubtitle")}
              align="center"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${bgColor} ${mainPading}`}>
      <div className="container mx-auto  px-4 md:px-10">
        {/* Section Header */}
        <SectionHeading title={t("hotelsHeading")} subtitle={t("hotelsSubtitle")} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          {/* Hotel slider */}
          <div
            className="flex min-h-0 flex-col lg:col-span-8"
            {...(loading
              ? {
                  role: "status",
                  "aria-live": "polite" as const,
                  "aria-label": t("hotelsLoadingAria"),
                }
              : {})}
          >
            <div className="relative">
              {/* Swiper Slider */}
              <Swiper
                modules={[Navigation]}
                spaceBetween={20}
                slidesPerView={1}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 20,
                  },
                  1024: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                  },
                }}
                navigation={{
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }}
                onSwiper={(swiper) => {
                  setSwiperInstance(swiper);
                }}
              >
                {loading
                  ? Array.from({ length: 6 }, (_, index) => (
                      <SwiperSlide key={`hotel-skel-${index}`}>
                        <HotelCardSkeletonTile />
                      </SwiperSlide>
                    ))
                  : hotels.map((hotel, index) => (
                      <SwiperSlide key={hotel.id || index}>
                        <Card
                          variant="hotel"
                          data={hotel}
                          actionHref={hotel.actionHref ?? `/hotels/${hotel.id}`}
                          className="h-full"
                        />
                      </SwiperSlide>
                    ))}
              </Swiper>

              {/* Custom Navigation - Positioned at middle right like traveltourup.com */}
              <div className="absolute top-1/2  z-10 w-full flex items-center justify-between px-4 space-x-2 -translate-y-1/2">
                <button
                  ref={prevRef}
                  type="button"
                  aria-label={tCommon("previous")}
                  className="swiper-button-prev-featured p-2 rounded-full bg-primary/60 shadow-lg flex items-center justify-center hover:bg-primary/20 transition-colors border border-border shadow-md"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2} aria-hidden />
                </button>
                <button
                  ref={nextRef}
                  type="button"
                  aria-label={tCommon("next")}
                  className="swiper-button-next-featured p-2 rounded-full bg-primary/60 shadow-lg flex items-center justify-center hover:bg-primary/20 transition-colors border border-border shadow-md"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* Promo banner — matches spec: min-heights mobile/tablet, h-full on lg */}
          <div className="flex min-h-0 flex-col lg:col-span-4 lg:h-full">
            <div className="group relative flex h-full min-h-[26rem] w-full flex-1 flex-col justify-end overflow-hidden rounded-2xl p-8 shadow-xl sm:min-h-[30rem] lg:min-h-0">
              {/* Background Image */}
              <div className="pointer-events-none absolute inset-0 z-0">
                {featuredAd?.image ? (
                  <Image
                    src={typeof featuredAd.image === "string" ? featuredAd.image : (featuredAd.image as { src: string }).src}
                    alt={t("hotelsAdAlt")}
                    fill
                    quality={75}
                    sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 45vw, 500px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized={shouldUnoptimizeStaysSupplierImage(
                      typeof featuredAd.image === "string"
                        ? featuredAd.image
                        : (featuredAd.image as { src: string }).src,
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent-500">
                    <span className="text-lg font-bold text-foreground">{t("hotelsFallbackBanner")}</span>
                  </div>
                )}
                {/* Readability over photo */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                  aria-hidden
                />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col">
                <div className="mb-6">
                  <h3 className="mb-2 text-xl font-bold text-primary-foreground drop-shadow-sm">
                    {t("hotelsDiscoverTitle")}
                  </h3>
                  <h4 className="mb-2 text-xl font-bold text-primary-foreground drop-shadow-sm">
                    {t("hotelsDiscoverSubtitle")}
                  </h4>
                </div>

                <Button
                  href="/hotels"
                  variant="primary-cta"
                  size="lg"
                  className="w-full transition-transform group-hover:scale-[1.02]"
                >
                  {t("hotelsViewMore")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedHotels;