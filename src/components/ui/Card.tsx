"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { Car, Hotel, CalendarCheck, Headphones } from "lucide-react";
import { MapPin, User, Luggage, Users, Plane, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import SectionHeading from "../shared/SectionHeading";
import { shouldUnoptimizeStaysSupplierImage } from "@/lib/images/stays-supplier-image";

// ─── Data Types (exported for parent components) ─────────────────────────────
export interface HotelCardData {
  id?: number;
  name?: string;
  location?: string;
  price?: number;
  rating?: number;
  reviews?: string;
  image?: string | { src: string };
  facilities?: string[];
  originalPrice?: number;
}

export interface CarCardData {
  id?: number;
  name?: string;
  type?: string;
  passengers?: number;
  luggage?: number;
  price?: number;
  image?: string | { src: string };
}

export interface CategoryCardData {
  id?: number;
  name?: string;
  image?: string | { src: string };
}

export interface FlightCardData {
  id?: string | number;
  airline?: string;
  airlineLogo?: string | { src: string };
  price?: number;
  /** ISO 4217; defaults to USD in the card if omitted */
  currency?: string;
  departureTime?: string;
  departureCity?: string;
  arrivalTime?: string;
  arrivalCity?: string;
  duration?: string;
  stops?: string;
  /** Omit for Duffel-sourced cards (no seat inventory on offer list). */
  seats?: number;
}

export interface HistoryFeature {
  icon?: React.ReactNode;
  title: string;
}

export interface HistoryCardData {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: HistoryFeature[];
}

// ─── Card Props (discriminated union) ────────────────────────────────────────
export type CardProps =
  | { variant: "hotel"; data: HotelCardData; actionHref?: string; paymentHref?: string; className?: string }
  | { variant: "car"; data: CarCardData; actionHref?: string; paymentHref?: string; className?: string }
  | { variant: "category"; data: CategoryCardData; actionHref?: string; className?: string }
  | { variant: "flight"; data: FlightCardData; actionHref?: string; paymentHref?: string; className?: string }
  | { variant: "history"; data: HistoryCardData; actionHref?: string; className?: string };

// ─── Constants ─────────────────────────────────────────────────────────────
const CARD_BASE =
  "rounded-xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1";

const IMAGE_HOVER = "object-cover group-hover:scale-110 transition-transform duration-500";

const IMAGE_SIZES_DEFAULT = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
const IMAGE_SIZES_CATEGORY = "(max-width: 768px) 256px, 256px";

function getImageSrc(src: string | { src: string } | undefined): string {
  if (!src) return "";
  return typeof src === "string" ? src : src.src;
}

// ─── Icons ──────────────────────────────────────────────────────────────────
const LocationIcon = () => (
  <MapPin className="w-4 h-4 mr-2 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
);

const UserIcon = () => (
  <User className="w-5 h-5 mr-2 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
);

const LuggageIcon = () => (
  <Luggage className="w-5 h-5 mr-2 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
);

const SeatsIcon = () => (
  <Users className="w-4 h-4 mr-1 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
);

const PlaneIcon = () => (
  <Plane className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={2} aria-hidden />
);

const ChevronIcon = () => (
  <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" strokeWidth={2} aria-hidden />
);

// ─── Main Card Component ────────────────────────────────────────────────────
export function Card(props: CardProps) {
  const { variant, data, actionHref, className = "" } = props;
  const baseClass =
    variant === "history" ? className.trim() : `${CARD_BASE} ${className}`.trim();

  switch (variant) {
    case "hotel":
      return (
        <HotelCard
          data={data}
          detailHref={actionHref ?? (data.id != null ? `/hotels/${data.id}` : "/hotels")}
          paymentHref={props.paymentHref ?? "/hotels/payment"}
          className={baseClass}
        />
      );
    case "car":
      return (
        <CarCard
          data={data}
          detailHref={actionHref ?? (data.id != null ? `/cars/${data.id}` : "/cars")}
          paymentHref={props.paymentHref ?? "/cars/payment"}
          className={baseClass}
        />
      );
    case "category":
      return <CategoryCard data={data} actionHref={actionHref ?? "/flights"} className={baseClass} />;
    case "flight":
      return (
        <FlightCard
          data={data}
          detailHref={actionHref ?? (data.id != null ? `/flights/${data.id}` : "/flights")}
          paymentHref={props.paymentHref ?? "/flights/payment"}
          className={baseClass}
        />
      );
    case "history":
      return <HistoryCard data={data as HistoryCardData} className={baseClass} />;
    default:
      return null;
  }
}

// ─── Hotel Card ─────────────────────────────────────────────────────────────
function HotelCard({
  data,
  detailHref,
  paymentHref,
  className,
}: {
  data: HotelCardData;
  detailHref: string;
  paymentHref: string;
  className: string;
}) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { formatFromUsd } = useCurrency();
  const name = data.name ?? "Hotel Name";
  const location = data.location ?? "Location";
  const price = data.price ?? 0;
  const rating = data.rating ?? 4.5;
  const reviews = data.reviews ?? "0";
  const facilities = data.facilities ?? [];
  const hasImage = !!data.image && !!getImageSrc(data.image);

  return (
    <div className={`${className} h-full bg-card`}>
      {hasImage ? (
        <div className="relative h-56 overflow-hidden rounded-t-xl">
          <Image
            src={getImageSrc(data.image!)}
            alt={`${name} - ${location}`}
            fill
            quality={75}
            sizes={IMAGE_SIZES_DEFAULT}
            className={IMAGE_HOVER}
            unoptimized={shouldUnoptimizeStaysSupplierImage(getImageSrc(data.image!))}
          />
          <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm flex items-center border border-border">
            <span className="text-yellow-500 mr-1" aria-hidden>★</span>
            <span className="font-bold text-foreground">{rating}</span>
            <span className="text-muted-foreground text-sm ml-1">({reviews})</span>
          </div>
        </div>
      ) : (
        <div className="relative h-56 bg-muted flex items-center justify-center rounded-t-xl">
          <span className="text-muted-foreground">No Image</span>
        </div>
      )}
      <div className="p-4">
        <Link
          href={detailHref}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1 transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>
        <div className="flex items-center text-muted-foreground mb-3">
          <LocationIcon />
          <span className="text-sm">{location}</span>
        </div>
        <div className="flex items-center text-muted-foreground mb-4 flex-wrap gap-x-3">
          {facilities.length > 0 ? (
            facilities.slice(0, 3).map((f, i) => (
              <span key={i} className="text-xs">{f}</span>
            ))
          ) : (
            <span className="text-xs">No facilities listed</span>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary">{formatFromUsd(price, locale)}</span>
              <span className="text-muted-foreground text-sm ml-1">/night</span>
            </div>
            {data.originalPrice != null && (
              <span className="text-muted-foreground text-sm line-through">{formatFromUsd(data.originalPrice ?? 0, locale)}</span>
            )}
          </div>
          <Link href={paymentHref}>
            <Button
              variant="primary"
              size="md"
            >
              {t("bookNow")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Car Card ───────────────────────────────────────────────────────────────
function CarCard({
  data,
  detailHref,
  paymentHref,
  className,
}: {
  data: CarCardData;
  detailHref: string;
  paymentHref: string;
  className: string;
}) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { formatFromUsd } = useCurrency();
  const name = data.name ?? "";
  const type = data.type ?? "";
  const price = data.price ?? 0;
  const passengers = data.passengers ?? 0;
  const luggage = data.luggage ?? 0;
  const hasImage = !!data.image && !!getImageSrc(data.image);

  return (
    <div className={`${className} h-full bg-card`}>
      {hasImage ? (
        <div className="relative h-48 overflow-hidden rounded-t-xl">
          <Image
            src={getImageSrc(data.image!)}
            alt={`${name} - ${type}`}
            fill
            quality={75}
            sizes={IMAGE_SIZES_DEFAULT}
            className={IMAGE_HOVER}
          />
          <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
            {type}
          </div>
        </div>
      ) : (
        <div className="relative h-48 overflow-hidden rounded-t-xl">
          <div className="w-full h-full bg-gradient-to-br from-muted to-border flex items-center justify-center">
            <span className="text-muted-foreground font-bold text-lg">{type}</span>
          </div>
          <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
            {type}
          </div>
        </div>
      )}
      <div className="p-5">
        <Link
          href={detailHref}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3 className="font-bold text-xl text-foreground mb-3 transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>
        <div className="flex items-center text-muted-foreground mb-4">
          <div className="flex items-center mr-6">
            <UserIcon />
            <span className="text-sm">{passengers} Passengers</span>
          </div>
          <div className="flex items-center">
            <LuggageIcon />
            <span className="text-sm">{luggage} Luggage</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary">{formatFromUsd(price, locale)}</span>
              <span className="text-muted-foreground text-sm ml-1">/day</span>
            </div>
          </div>
          <Link href={paymentHref}>
            <Button
              variant="primary"
              size="md"
            >
              {t("bookNow")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Category Card ──────────────────────────────────────────────────────────
function CategoryCard({
  data,
  actionHref,
  className,
}: {
  data: CategoryCardData;
  actionHref: string;
  className: string;
}) {
  const name = data.name ?? "";
  const imageSrc = data.image ? getImageSrc(data.image) : "";

  return (
    <div className={`${className}`}>
      <div className="relative h-48 overflow-hidden rounded-t-2xl">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={`Explore ${name} destinations`}
              fill
              quality={75}
              sizes={IMAGE_SIZES_CATEGORY}
              className={IMAGE_HOVER}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" aria-hidden />
          </>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">{name}</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-xl text-foreground mb-2">{name}</h3>
        <div className="flex items-center justify-between">
          <Link href={actionHref}>
            <button className="text-primary hover:text-primary-600 font-medium text-sm flex items-center">
              Explore
              <ChevronIcon />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Flight Card ────────────────────────────────────────────────────────────
function FlightCard({
  data,
  detailHref,
  paymentHref,
  className,
}: {
  data: FlightCardData;
  detailHref: string;
  paymentHref: string;
  className: string;
}) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const airline = data.airline ?? "";
  const logoSrc = data.airlineLogo ? getImageSrc(data.airlineLogo) : null;
  const price = data.price ?? 0;
  const departureTime = data.departureTime ?? "";
  const departureCity = data.departureCity ?? "";
  const arrivalTime = data.arrivalTime ?? "";
  const arrivalCity = data.arrivalCity ?? "";
  const duration = data.duration ?? "";
  const stops = data.stops ?? "";
  const seats = data.seats ?? 0;
  const currency = data.currency ?? "USD";
  const priceLabel =
    typeof price === "number"
      ? formatPrice(price, currency, locale)
      : "";
  return (
    <div className={`${className} p-5 bg-card`}>
      <div className="flex flex-col   justify-between mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
          <div className="w-10 h-10 p-[6px] rounded-full bg-muted flex items-center justify-center mr-3 border border-border shrink-0">
            {logoSrc ? (
              <Image src={logoSrc} alt={airline} width={24} height={24} className="w-6 h-6" />
            ) : (
              <span className="text-primary font-bold">{airline.charAt(0)}</span>
            )}
          </div>
          <Link
            href={detailHref}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h4 className="font-bold text-foreground transition-colors hover:text-primary">{airline}</h4>
          </Link>

          </div>
        </div>
   
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-foreground">{departureTime}</div>
            <div className="text-muted-foreground text-sm">{departureCity}</div>
          </div>
          <div className="flex flex-col items-center mx-4">
            <div className="text-muted-foreground text-xs mb-1">{duration}</div>
            <div className="relative flex h-4 w-20 shrink-0 items-center justify-center">
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border"
                aria-hidden
              />
              <span className="relative z-[1] flex items-center justify-center bg-card px-0.5">
                <PlaneIcon />
              </span>
            </div>
            <div className="text-muted-foreground text-xs mt-1">{stops}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">{arrivalTime}</div>
            <div className="text-muted-foreground text-sm">{arrivalCity}</div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2">
         
         
         <div className="text-muted-foreground text-sm">per person</div>
         <div className="text-2xl font-bold text-primary">{priceLabel}</div>
    
     </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center text-muted-foreground text-sm min-h-[1.25rem]">
          {seats > 0 ? (
            <>
              <SeatsIcon />
              <span>{seats} seats left</span>
            </>
          ) : (
            <span className="text-xs">Live fare — confirm on next step</span>
          )}
        </div>
        <Link href={paymentHref}>
          <Button
            variant="primary"
            size="md"
          >
            {t("bookNow")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── History Card (About page & reusable) ─────────────────────────────────────
function HistoryCard({
  data,
  className,
}: {
  data: HistoryCardData;
  className: string;
}) {
  const title = data.title ?? "Explore the World with Us";
  const subtitle = data.subtitle ?? "Since 1998";
  const description =
    data.description ??
    "We started with a vision to provide reliable and comfortable travel services. Today, we offer an extensive selection of luxury cars for a smooth and premium travel experience.";

  const features: HistoryFeature[] =
    data.features && data.features.length
      ? data.features
      : [
          { icon: <Car className="w-8 h-8" />, title: "Extensive Selection of Luxury Cars" },
          { icon: <Hotel className="w-8 h-8" />, title: "Well-Maintained & Luxury Hotels" },
          { icon: <CalendarCheck className="w-8 h-8" />, title: "Easy and Intuitive Booking Process" },
          { icon: <Headphones className="w-8 h-8" />, title: "Exceptional Customer Service" },
        ];

  return (
    <div className={`${className} `}>
      <div className=" ">
        <div className="mb-4">
          <SectionHeading title={title} subtitle={description} />
                 </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          {features.map((feature, idx) => (
            <div
              key={feature.title ?? idx}
              className="group bg-primary/10 border-none shadow-none px-4 py-4 rounded-2xl flex flex-col justify-between gap-3"
            >
              {feature.icon && (
                <div className="text-primary">
                  <span className="inline-block transition-transform duration-300 group-hover:scale-[1.3]">
                    {feature.icon}
                  </span>
                </div>
              )}
              <h3 className="text-md font-semibold text-foreground leading-snug">
                {feature.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
