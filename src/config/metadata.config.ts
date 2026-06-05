import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/config/brand";
import { defaultLocale, routing } from "@/i18n/routing";
import { getSiteUrl } from "@/config/site-url";

export { SITE_NAME };

/** Resolved at module load; prefer getSiteUrl() when call-site timing matters. */
export const BASE_URL = getSiteUrl();

export interface RouteMetadata {
  title: string;
  description: string;
  openGraph?: {
    title?: string;
    description?: string;
  };
  keywords?: string[];
}

/** Keep in sync with `Seo.routes` keys in every `messages/*.json` when changing public SEO copy. */
export const ROUTE_PATH_TO_SEO_KEY: Record<string, string> = {
  "/": "home",
  "/about": "about",
  "/contact": "contact",
  "/faqs": "faqs",
  "/flights": "flights",
  "/hotels": "hotels",
  "/cars": "cars",
  "/flightbooking": "flightbooking",
  "/hotelbooking": "hotelbooking",
  "/carbooking": "carbooking",
  "/login": "login",
  "/signup": "signup",
  "/verify-phone": "verify_phone",
  "/cars/payment": "cars_payment",
  "/hotels/payment": "hotels_payment",
  "/flights/payment": "flights_payment",
  "/privacy": "privacy",
  "/terms": "terms",
  "/blog": "blog",
  "/forgot-password": "forgot_password",
  "/profile": "profile",
  "/profile/bookings": "profile_bookings",
  "/profile/bookings/detail": "profile_booking_detail",
  "/profile/flight-activity": "profile_flight_activity",
};

/**
 * Keyword hints for Next Metadata (not a ranking factor for Google; useful for consistency and tooling).
 */
export const ROUTE_KEYWORDS: Partial<Record<string, string[]>> = {
  "/": [
    "TravelTourUp",
    "online travel booking platform",
    "book flights and hotels",
    "cheap flight tickets",
    "best hotel deals",
    "international travel booking",
    "worldwide hotel booking",
    "global flight deals",
    "luxury travel packages",
    "vacation packages",
    "business travel booking",
    "travel deals worldwide",
    "affordable flights",
    "travel and tourism platform",
    "airline ticket booking",
    "holiday booking platform",
    "flight and hotel packages",
    "24/7 travel support",
    "travel discounts",
    "secure online booking",
  ],

  "/flights": [
    "book flights online",
    "cheap flights",
    "international flights",
    "domestic flights",
    "airline tickets",
    "flight booking deals",
    "last minute flights",
    "round trip flights",
    "one way flights",
    "multi city flights",
    "business class flights",
    "economy flight tickets",
    "best airfare deals",
    "global flight booking",
    "discount airline tickets",
    "direct flights",
    "cheap international airfare",
    "flight reservation platform",
    "worldwide flight booking",
    "TravelTourUp flights",
  ],

  "/hotels": [
    "book hotels online",
    "hotel booking worldwide",
    "cheap hotels",
    "luxury hotels",
    "budget accommodation",
    "best hotel deals",
    "resort booking",
    "vacation stays",
    "family hotels",
    "business hotels",
    "beach resorts",
    "5 star hotels",
    "apartments and suites",
    "travel accommodation",
    "hotel reservations",
    "holiday resorts",
    "worldwide stays",
    "premium hotels",
    "discount hotel rooms",
    "TravelTourUp hotels",
  ],

  "/cars": [
    "car rental",
    "rent a car",
    "airport car rental",
    "luxury car hire",
    "cheap rental cars",
    "vehicle hire",
    "travel transportation",
    "self drive cars",
    "chauffeur service",
    "airport transfer",
    "SUV rental",
    "economy car rental",
    "business travel transport",
    "international car rental",
    "TravelTourUp cars",
  ],

  "/blog": [
    "travel blog",
    "travel tips",
    "travel guides",
    "best destinations",
    "vacation ideas",
    "travel inspiration",
    "tourism news",
    "flight travel tips",
    "hotel booking guides",
    "international travel advice",
    "budget travel tips",
    "luxury travel blog",
    "travel itineraries",
    "world travel guide",
    "TravelTourUp blog",
  ],

  "/about": [
    "about TravelTourUp",
    "travel booking company",
    "global travel platform",
    "trusted travel agency",
    "online tourism company",
    "worldwide travel services",
    "travel technology company",
    "flight and hotel experts",
    "travel management platform",
  ],

  "/contact": [
    "contact TravelTourUp",
    "travel customer support",
    "booking assistance",
    "travel help center",
    "24/7 travel support",
    "flight booking support",
    "hotel booking help",
    "travel customer service",
  ],

  "/faqs": [
    "travel FAQs",
    "booking help",
    "flight booking questions",
    "hotel reservation help",
    "travel support guide",
    "refund policy help",
    "travel assistance",
    "TravelTourUp help center",
  ],

  "/privacy": [
    "TravelTourUp privacy policy",
    "data protection policy",
    "secure travel booking",
    "user privacy",
    "travel booking security",
    "online payment protection",
  ],

  "/terms": [
    "TravelTourUp terms and conditions",
    "travel booking terms",
    "flight booking policy",
    "hotel reservation terms",
    "travel platform conditions",
  ],

  "/login": [
    "TravelTourUp login",
    "travel account login",
    "customer dashboard login",
    "booking account access",
    "secure travel login",
  ],

  "/signup": [
    "create TravelTourUp account",
    "travel booking registration",
    "sign up for travel deals",
    "register travel account",
    "join TravelTourUp",
  ],

  "/verify-phone": [
    "phone verification",
    "SMS OTP verification",
    "verify mobile number",
    "TravelTourUp account security",
  ],
};

function buildVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google: [google] } : {}),
    ...(bing
      ? {
          other: {
            "msvalidate.01": [bing],
          },
        }
      : {}),
  };
}

/** Public path as in ROUTE_METADATA keys: "/" for home, "/about" for about, etc. */
export function normalizePublicPath(routePath: string): string {
  if (!routePath || routePath === "/") return "";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

export function buildLocaleAlternates(
  locale: string,
  routePath: string,
): NonNullable<Metadata["alternates"]> {
  const pathSeg = normalizePublicPath(routePath);
  const base = getSiteUrl();
  const canonicalRel = pathSeg === "" ? `/${locale}` : `/${locale}${pathSeg}`;
  const canonical = `${base}${canonicalRel}`;

  const languages: Record<string, string> = {
    "x-default": pathSeg === "" ? `${base}/${defaultLocale}` : `${base}/${defaultLocale}${pathSeg}`,
  };
  for (const l of routing.locales) {
    languages[l] = pathSeg === "" ? `${base}/${l}` : `${base}/${l}${pathSeg}`;
  }
  return { canonical, languages };
}

export function createLocalizedRouteMetadata(
  config: RouteMetadata,
  locale: string,
  canonicalPath: string,
  options?: { robots?: Metadata["robots"] },
): Metadata {
  const pathSeg = normalizePublicPath(canonicalPath);
  const absBase = getSiteUrl();
  const ogUrl = pathSeg === "" ? `${absBase}/${locale}` : `${absBase}/${locale}${pathSeg}`;

  const ogLocale =
    locale === "en"
      ? "en_US"
      : locale === "fr"
        ? "fr_FR"
        : locale === "ar"
          ? "ar_SA"
          : locale === "ru"
            ? "ru_RU"
            : locale === "ur"
              ? "ur_PK"
              : `${locale}_${locale.toUpperCase()}`;

  const md: Metadata = {
    title: config.title,
    description: config.description,
    ...(config.keywords?.length ? { keywords: config.keywords } : {}),
    alternates: buildLocaleAlternates(locale, canonicalPath),
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: ogUrl,
      siteName: SITE_NAME,
      title: config.openGraph?.title ?? config.title,
      description: config.openGraph?.description ?? config.description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: config.openGraph?.title ?? config.title,
      description: config.openGraph?.description ?? config.description,
      images: ["/opengraph-image"],
      ...(process.env.NEXT_PUBLIC_TWITTER_SITE?.trim()
        ? { site: process.env.NEXT_PUBLIC_TWITTER_SITE.trim() }
        : {}),
    },
    ...(options?.robots ? { robots: options.robots } : {}),
  };
  return md;
}

export async function getLocalizedRouteMetadata(
  locale: string,
  routePath: string,
): Promise<RouteMetadata> {
  const base = ROUTE_METADATA[routePath] ?? {
    title: SITE_NAME,
    description: `Book flights, hotels, and cars with ${SITE_NAME}.`,
    openGraph: {
      title: SITE_NAME,
      description: `Book flights, hotels, and cars with ${SITE_NAME}.`,
    },
  };
  const keywordList = ROUTE_KEYWORDS[routePath];
  const keywordProps = keywordList?.length ? { keywords: keywordList } : {};

  const key = ROUTE_PATH_TO_SEO_KEY[routePath];
  if (!key) {
    return keywordList?.length ? { ...base, keywords: keywordList } : base;
  }
  const t = await getTranslations({ locale, namespace: "Seo" });
  const p = `routes.${key}`;
  return {
    title: t(`${p}.title`),
    description: t(`${p}.description`),
    openGraph: {
      title: t(`${p}.ogTitle`),
      description: t(`${p}.ogDescription`),
    },
    ...keywordProps,
  };
}

export async function metadataForLocalizedRoute(
  locale: string,
  routePath: string,
  options?: { robots?: Metadata["robots"]; canonicalPath?: string },
): Promise<Metadata> {
  const config = await getLocalizedRouteMetadata(locale, routePath);
  const canonicalPath = options?.canonicalPath ?? routePath;
  return createLocalizedRouteMetadata(config, locale, canonicalPath, {
    robots: options?.robots,
  });
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Book Flights, Hotels & Car Rentals Worldwide`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Compare and book flights, hotels, and car rentals in one place. Transparent search, secure checkout, and 24/7 support for leisure and business trips.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Book flights, hotels & cars`,
    description:
      "Search worldwide flights, stays, and rentals. Find competitive fares and complete your trip with confidence.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Book flights, hotels & cars`,
    description:
      "Search worldwide flights, stays, and rentals. Find competitive fares and complete your trip with confidence.",
    ...(process.env.NEXT_PUBLIC_TWITTER_SITE?.trim()
      ? { site: process.env.NEXT_PUBLIC_TWITTER_SITE.trim() }
      : {}),
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(() => {
    const v = buildVerification();
    return v ? { verification: v } : {};
  })(),
};

/** @deprecated Prefer getLocalizedRouteMetadata + createLocalizedRouteMetadata for localized canonicals. */
export function createRouteMetadata(config: RouteMetadata): Metadata {
  return {
    title: config.title,
    description: config.description,
    ...(config.keywords?.length ? { keywords: config.keywords } : {}),
    openGraph: {
      title: config.openGraph?.title ?? config.title,
      description: config.openGraph?.description ?? config.description,
    },
  };
}

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  "/": {
    title: `${SITE_NAME} — Book Flights, Hotels & Car Rentals Worldwide`,
    description:
      "Compare and book flights, hotels, and car rentals in one place. Transparent search, secure checkout, and 24/7 support for leisure and business trips.",
    keywords: ROUTE_KEYWORDS["/"],
    openGraph: {
      title: `Book flights, hotels & cars — ${SITE_NAME}`,
      description:
        "Search worldwide flights, stays, and rentals. Find competitive fares and complete your trip with confidence.",
    },
  },
  "/about": {
    title: "About TravelTourUp | Global flight & hotel booking partner",
    description:
      "Learn how TravelTourUp helps travelers book flights, hotels, and car rentals with a simple, secure platform and responsive support.",
    keywords: ROUTE_KEYWORDS["/about"],
    openGraph: {
      title: `About us — ${SITE_NAME}`,
      description: "Our mission: make travel booking straightforward and trustworthy for every trip.",
    },
  },
  "/contact": {
    title: "Contact TravelTourUp | Customer support & travel help",
    description:
      "Reach TravelTourUp for booking help, flight and hotel questions, refunds, or trip planning support.",
    keywords: ROUTE_KEYWORDS["/contact"],
    openGraph: {
      title: `Contact us — ${SITE_NAME}`,
      description: "Get in touch with our team for reservations, billing, and travel assistance.",
    },
  },
  "/faqs": {
    title: "Travel booking FAQs | Flights, hotels & cars — TravelTourUp",
    description:
      "Answers to common questions about booking flights, hotels, and car rentals, payments, changes, and policies on TravelTourUp.",
    keywords: ROUTE_KEYWORDS["/faqs"],
    openGraph: {
      title: `Frequently asked questions — ${SITE_NAME}`,
      description: "Booking help, refunds, account support, and more.",
    },
  },
  "/flights": {
    title: "Cheap flights & airline tickets | Book online — TravelTourUp",
    description:
      "Search domestic and international flights, compare airlines and fares, and book airline tickets with secure payment and booking support.",
    keywords: ROUTE_KEYWORDS["/flights"],
    openGraph: {
      title: `Book flights online — ${SITE_NAME}`,
      description: "Find flight deals, compare options, and reserve your next trip.",
    },
  },
  "/hotels": {
    title: "Hotels & accommodations | Best rates & booking — TravelTourUp",
    description:
      "Find hotels, resorts, and vacation stays worldwide. Compare prices, amenities, and locations, then book your room securely.",
    keywords: ROUTE_KEYWORDS["/hotels"],
    openGraph: {
      title: `Book hotels worldwide — ${SITE_NAME}`,
      description: "Search stays from budget to luxury and reserve with confidence.",
    },
  },
  "/cars": {
    title: "Car rental & airport hire | Compare deals — TravelTourUp",
    description:
      "Rent a car for your trip—economy to premium. Compare pickup options, including airport rental, and book transparently.",
    keywords: ROUTE_KEYWORDS["/cars"],
    openGraph: {
      title: `Car rental deals — ${SITE_NAME}`,
      description: "Affordable and premium vehicles for business and leisure travel.",
    },
  },
  "/flightbooking": {
    title: "Book Your Flight",
    description: "Complete your flight booking securely.",
    openGraph: {
      title: `Book Your Flight — ${SITE_NAME}`,
      description: "Complete your flight booking.",
    },
  },
  "/hotelbooking": {
    title: "Book Your Hotel",
    description: "Complete your hotel reservation securely.",
    openGraph: {
      title: `Book Your Hotel — ${SITE_NAME}`,
      description: "Complete your hotel reservation.",
    },
  },
  "/carbooking": {
    title: "Book Your Car",
    description: "Complete your car rental booking securely.",
    openGraph: {
      title: `Book Your Car — ${SITE_NAME}`,
      description: "Complete your car rental booking.",
    },
  },
  "/login": {
    title: "Sign In",
    description: "Sign in to your TravelTourUp account.",
    openGraph: {
      title: `Sign In — ${SITE_NAME}`,
      description: "Access your account dashboard.",
    },
  },
  "/signup": {
    title: "Create Account",
    description: "Join TravelTourUp today and start booking your trips.",
    openGraph: {
      title: `Create Account — ${SITE_NAME}`,
      description: "Join TravelTourUp today.",
    },
  },
  "/verify-phone": {
    title: "Verify phone",
    description: "Confirm your mobile number with a one-time SMS code.",
    openGraph: {
      title: `Verify phone — ${SITE_NAME}`,
      description: "Secure your account with SMS verification.",
    },
  },
  "/cars/payment": {
    title: "Car rental payment",
    description: "Complete your car rental payment securely.",
    openGraph: {
      title: `Car rental payment — ${SITE_NAME}`,
      description: "Secure payment processing for your rental.",
    },
  },
  "/hotels/payment": {
    title: "Hotel payment",
    description: "Complete your hotel booking payment securely.",
    openGraph: {
      title: `Hotel payment — ${SITE_NAME}`,
      description: "Secure payment processing for your stay.",
    },
  },
  "/flights/payment": {
    title: "Flight payment",
    description: "Complete your flight booking payment securely.",
    openGraph: {
      title: `Flight payment — ${SITE_NAME}`,
      description: "Secure payment processing for your flight.",
    },
  },
  "/flights/change": {
    title: "Change flight",
    description: "Change your confirmed flight booking.",
    openGraph: {
      title: `Change flight — ${SITE_NAME}`,
      description: "Select new dates or routes for your booking.",
    },
  },
  "/flights/change/offers": {
    title: "Available flight changes",
    description: "Review airline change options for your booking.",
    openGraph: {
      title: `Flight change options — ${SITE_NAME}`,
      description: "Compare change offers from the airline.",
    },
  },
  "/flights/change/detail": {
    title: "Review flight change",
    description: "Review your selected flight change before payment.",
    openGraph: {
      title: `Review flight change — ${SITE_NAME}`,
      description: "Confirm itinerary and price difference for your booking change.",
    },
  },
  "/flights/change/payment": {
    title: "Confirm flight change",
    description: "Review and pay for your flight change.",
    openGraph: {
      title: `Confirm flight change — ${SITE_NAME}`,
      description: "Complete your flight change payment.",
    },
  },
  "/privacy": {
    title: "Privacy Policy",
    description: "Our privacy policy and data practices.",
    openGraph: {
      title: `Privacy Policy — ${SITE_NAME}`,
      description: "How we protect your data.",
    },
  },
  "/terms": {
    title: "Terms of Service",
    description: "Our terms and conditions.",
    openGraph: {
      title: `Terms of Service — ${SITE_NAME}`,
      description: "Terms and conditions for using our platform.",
    },
  },
  "/blog": {
    title: "Travel guides & tips | Flights, hotels & trips — TravelTourUp",
    description:
      "Inspiration and practical guides for flying, finding hotels, road trips, and getting more from your next booking.",
    keywords: ROUTE_KEYWORDS["/blog"],
    openGraph: {
      title: `Travel guides & news — ${SITE_NAME}`,
      description: "Tips for smarter flight and hotel booking and better trips.",
    },
  },
  "/forgot-password": {
    title: "Reset password",
    description: "Request a password reset link for your TravelTourUp account.",
    openGraph: {
      title: `Reset password — ${SITE_NAME}`,
      description: "Request a secure password reset link.",
    },
  },
  "/profile": {
    title: "Profile",
    description: "Your TravelTourUp account details",
    openGraph: {
      title: `Profile — ${SITE_NAME}`,
      description: "Manage your TravelTourUp account.",
    },
  },
  "/profile/bookings": {
    title: "My bookings",
    description: "View your TravelTourUp flight, hotel, and car bookings.",
    openGraph: {
      title: `My bookings — ${SITE_NAME}`,
      description: "Your reservations and trip details.",
    },
  },
  "/profile/bookings/detail": {
    title: "Booking details",
    description: "Review your TravelTourUp booking confirmation and references.",
    openGraph: {
      title: `Booking details — ${SITE_NAME}`,
      description: "Confirmation and references for your trip.",
    },
  },
  "/profile/flight-activity": {
    title: "Flight payments & refunds",
    description: "Review charges and refunds for your flight bookings on TravelTourUp.",
    openGraph: {
      title: `Flight payments — ${SITE_NAME}`,
      description: "Debit and credit history for your flights.",
    },
  },
};
