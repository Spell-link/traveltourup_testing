"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useBookingBreadcrumbHotelTitle } from "@/components/shared/BookingBreadcrumbHotelContext";
import { useBookingBreadcrumbFlightLabels } from "@/components/shared/BookingBreadcrumbFlightContext";
import { useBookingBreadcrumbProfileBookingTitle } from "@/components/shared/BookingBreadcrumbProfileBookingContext";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import {
  Globe,
  Mail,
  Plane,
  ClipboardList,
  Car,
  Building2,
  LogIn,
  UserPlus,
  CreditCard,
  ShieldCheck,
  FileText,
  Home,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  User,
} from "lucide-react";

const PAGE_ICONS = {
  about: Globe,
  contact: Mail,
  faqs: FileText,
  flights: Plane,
  "flight-search": Plane,
  flightbooking: ClipboardList,
  cars: Car,
  "car-search": Car,
  carbooking: ClipboardList,
  hotels: Building2,
  "hotel-search": Building2,
  hotelbooking: ClipboardList,
  login: LogIn,
  signup: UserPlus,
  payment: CreditCard,
  privacy: ShieldCheck,
  terms: FileText,
  profile: User,
} as const;

/** Matches breadcrumb segment keys → PAGE_ICONS (titles/descriptions come from messages). */
const CRUMB_ICON_BY_SEGMENT: Record<string, keyof typeof PAGE_ICONS> = {
  about: "about",
  contact: "contact",
  faqs: "faqs",
  flights: "flights",
  "flight-search": "flight-search",
  flightbooking: "flightbooking",
  cars: "cars",
  "car-search": "car-search",
  carbooking: "carbooking",
  hotels: "hotels",
  "hotel-search": "hotel-search",
  hotelbooking: "hotelbooking",
  login: "login",
  signup: "signup",
  payment: "payment",
  privacy: "privacy",
  terms: "terms",
  profile: "profile",
};

/** Numeric mock id or Duffel offer id (`off_…`): never show raw segment as the label. */
function isFlightDetailSegment(segment: string): boolean {
  return /^\d+$/.test(segment) || /^off_/i.test(segment);
}

function isFlightDetailPage(segments: string[]): boolean {
  return (
    segments[0] === "flights" &&
    segments.length === 2 &&
    isFlightDetailSegment(segments[1] ?? "")
  );
}

/** Internal booking id on `/profile/bookings/:id` — hide raw cuid from crumbs. */
function isProfileBookingIdSegment(segment: string): boolean {
  return /^[a-z0-9]{12,}$/i.test(segment);
}

function isProfileBookingDetailPage(segments: string[]): boolean {
  return (
    segments[0] === "profile" &&
    segments[1] === "bookings" &&
    segments.length === 3 &&
    isProfileBookingIdSegment(segments[2] ?? "")
  );
}

function shouldUseParentSectionIcon(segments: string[], currentSegment: string) {
  if (segments.length !== 2) return false;
  const section = segments[0];
  if (!CRUMB_ICON_BY_SEGMENT[section]) return false;
  if (CRUMB_ICON_BY_SEGMENT[currentSegment]) return false;
  if (section === "flights" && isFlightDetailSegment(currentSegment)) return true;
  if (section === "cars" && /^\d+$/.test(currentSegment)) return true;
  if (section === "hotels") return true;
  return false;
}

type TBreadcrumb = ReturnType<typeof useTranslations<"Breadcrumb">>;

function getLabel(
  segment: string,
  segments: string[],
  index: number,
  hotelsDetailTitle: string | null,
  flightDetailRouteLabel: string | null,
  profileBookingCrumbLabel: string | null,
  t: TBreadcrumb,
) {
  const titleKey = `pages.${segment}.title`;
  if (t.has(titleKey)) return t(titleKey);

  if (
    segments[0] === "profile" &&
    segments[1] === "bookings" &&
    segments.length === 3 &&
    index === 2 &&
    isProfileBookingIdSegment(segment)
  ) {
    return profileBookingCrumbLabel ?? t("detailBooking");
  }

  if (
    segments[0] === "hotels" &&
    segments.length === 2 &&
    index === 1 &&
    !t.has(titleKey)
  ) {
    if (hotelsDetailTitle) return hotelsDetailTitle;
    return t("detailHotel");
  }
  if (
    segments[0] === "flights" &&
    segments.length === 2 &&
    index === 1 &&
    isFlightDetailSegment(segment) &&
    !t.has(titleKey)
  ) {
    return flightDetailRouteLabel ?? t("detailFlight");
  }
  if (/^\d+$/.test(segment) && index > 0) {
    const parent = segments[index - 1];
    if (parent === "cars") return t("detailCar");
  }
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumb() {
  const locale = useLocale();
  const pathname = usePathname();
  const { hotelDetailCrumbLabel } = useBookingBreadcrumbHotelTitle();
  const { flightDetailRouteLabel, flightDetailPageTitle } = useBookingBreadcrumbFlightLabels();
  const { profileBookingCrumbLabel } = useBookingBreadcrumbProfileBookingTitle();
  const t = useTranslations("Breadcrumb");

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const currentSegment = segments[segments.length - 1];
  const onFlightDetail = isFlightDetailPage(segments);
  const onProfileBookingDetail = isProfileBookingDetailPage(segments);

  const currentTitleKey = `pages.${currentSegment}.title`;
  const resolvedPageTitle = t.has(currentTitleKey) ? t(currentTitleKey) : null;

  const title =
    resolvedPageTitle ??
    (onFlightDetail
      ? flightDetailPageTitle ?? t("detailFlight")
      : onProfileBookingDetail
        ? profileBookingCrumbLabel ?? t("detailBooking")
        : getLabel(
            currentSegment,
            segments,
            segments.length - 1,
            hotelDetailCrumbLabel,
            flightDetailRouteLabel,
            profileBookingCrumbLabel,
            t,
          ));

  const descKey = `pages.${currentSegment}.description`;
  const description = t.has(descKey) ? t(descKey) : "";

  const iconKey =
    CRUMB_ICON_BY_SEGMENT[currentSegment] ??
    (shouldUseParentSectionIcon(segments, currentSegment)
      ? CRUMB_ICON_BY_SEGMENT[segments[0]]
      : undefined) ??
    null;
  const IconComponent = iconKey ? PAGE_ICONS[iconKey] : null;

  const rtl = isRtlLocale(locale);
  const CrumbSep = rtl ? ChevronLeft : ChevronRight;

  const crumbs = segments.map((seg, i) => ({
    label: getLabel(seg, segments, i, hotelDetailCrumbLabel, flightDetailRouteLabel, profileBookingCrumbLabel, t),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  const pageIcon =
    IconComponent ? (
      <div className="mt-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08] bg-foreground/10 sm:flex">
        <IconComponent className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </div>
    ) : null;

  const titleBlock = (
    <div dir={rtlDirProp(locale)} className={rtlTypographyClass(locale)}>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">{title}</h1>
      {description && (
        <div className={cn("mt-2 flex w-full", rtl && "justify-end")}>
          <p className="max-w-2xl text-[18px] leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
        </div>
      )}
    </div>
  );

  return (
    <section className="relative w-full overflow-hidden bg-background breadcrumb-animate-in">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg className="absolute -left-8 top-0 h-full w-40 text-foreground/[0.04]" viewBox="0 0 160 200" fill="none" preserveAspectRatio="none">
          <path d="M80 0 C30 50, 130 100, 40 200" stroke="currentColor" strokeWidth="2" />
          <path d="M100 0 C50 60, 140 110, 60 200" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <svg className="absolute top-6 left-[15%] w-[70%] h-20 text-foreground/[0.06]" viewBox="0 0 800 80" fill="none">
          <path
            d="M0 70 Q400 -30 800 50"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            className="breadcrumb-animate-plane"
          />
        </svg>

        <div className="absolute top-1/2 -translate-y-1/2 right-[8%] w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-foreground/[0.06]" />
        <div className="absolute top-1/2 -translate-y-1/2 right-[8%] w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-foreground/[0.04]" style={{ transform: "translateY(-50%) rotate(60deg)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 right-[calc(8%+3.5rem)] sm:right-[calc(8%+4.5rem)] w-9 sm:w-12 h-36 sm:h-48 border-x border-foreground/[0.04] rounded-full" />

        <Compass className="absolute bottom-8 right-[4%] w-8 h-8 text-foreground/[0.08] breadcrumb-animate-compass" strokeWidth={1.5} aria-hidden />

        <div className="absolute top-[30%] left-[38%] w-5 h-5 rounded-full bg-primary/[0.2] breadcrumb-animate-dot" style={{ animationDelay: "0s" }} />
        <div className="absolute top-[55%] left-[42%] w-3.5 h-3.5 rounded-full bg-primary/[0.06] breadcrumb-animate-dot" style={{ animationDelay: "0.4s" }} />
        <div className="absolute top-[25%] left-[55%] w-2.5 h-2.5 rounded-full bg-primary/[0.10] breadcrumb-animate-dot" style={{ animationDelay: "0.8s" }} />

        <MapPin className="absolute top-4 right-[30%] w-6 h-6 text-foreground/[0.06]" strokeWidth={1.5} aria-hidden />
      </div>

      <div className="relative container mx-auto px-4 md:px-10 py-10 sm:py-12 lg:py-14">
        <nav aria-label={t("ariaLabel")}>
          <ol
            dir={rtlDirProp(locale)}
            className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] sm:text-[14px]"
          >
            <li
              dir="ltr"
              className="breadcrumb-animate-stagger"
              style={{ animationDelay: "0.05s" }}
            >
              <Link
                href="/"
                className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground breadcrumb-link-hover"
              >
                <Home className="breadcrumb-icon-hover h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span dir={rtlDirProp(locale)} className={rtl ? rtlTypographyClass(locale) : undefined}>
                  {t("home")}
                </span>
              </Link>
            </li>
            {crumbs.map(({ label, href, isLast }, i) => (
              <li
                key={href}
                dir="ltr"
                className="breadcrumb-animate-stagger flex items-center gap-2"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <CrumbSep className="h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={2.5} />
                {isLast ? (
                  <span
                    dir={rtlDirProp(locale)}
                    className={cn(
                      "font-semibold text-foreground",
                      rtl && rtlTypographyClass(locale),
                    )}
                    aria-current="page"
                  >
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => history.back()}
                    dir={rtlDirProp(locale)}
                    className={cn(
                      "breadcrumb-link-hover text-muted-foreground hover:text-foreground",
                      rtl && rtlTypographyClass(locale),
                    )}
                  >
                    {label}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div
          className={cn(
            "breadcrumb-animate-title flex items-start gap-4",
            rtl && "w-full justify-end",
          )}
        >
          {!rtl && pageIcon}
          {titleBlock}
          {rtl && pageIcon}
        </div>
      </div>
    </section>
  );
}
