import type { Metadata } from "next";
import {
  createLocalizedRouteMetadata,
  getLocalizedRouteMetadata,
} from "@/config/metadata.config";
import { MOCK_HOTELS } from "@/data/mock-hotels";
import {
  buildDetailReturnPath,
  requireCustomerLogin,
} from "@/lib/auth/require-customer-login";
import { isDuffelConfigured } from "@/lib/duffel/config";
import {
  buildHotelTripSnapshotFromRates,
  buildMinimalHotelSnapshot,
  formatRouteLabel,
} from "@/lib/journey/journey-trip-snapshot";
import { runStaysFetchAllRates } from "@/lib/services/stays/stays-rates.service";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import HotelDetailPageClient from "./HotelDetailPageClient";

function isDuffelStaysSearchResultRouteId(id: string) {
  return /^[a-z]{2,}_[A-Za-z0-9_-]+$/.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const raw = id.trim();
  const decoded = decodeURIComponent(raw);
  const path = decoded ? `/hotels/${encodeURIComponent(raw)}` : "/hotels";
  const base = await getLocalizedRouteMetadata(locale, "/hotels");

  const isDuffelStays = isDuffelStaysSearchResultRouteId(decoded);
  const mockHotel = !isDuffelStays ? MOCK_HOTELS.find((h) => String(h.id) === decoded) : undefined;
  const descSnippet = mockHotel?.description?.trim() ?? "";

  const config = {
    ...base,
    title: mockHotel ? `${mockHotel.name} — Hotel` : "Hotel offer details",
    description: mockHotel
      ? (descSnippet
          ? `${descSnippet.slice(0, 155)}${descSnippet.length > 155 ? "…" : ""}`
          : "View hotel details and book on TravelTourUp.")
      : "Review this hotel rate and continue to booking on TravelTourUp.",
    openGraph: {
      title: mockHotel ? `${mockHotel.name} — TravelTourUp` : "Hotel offer details",
      description: mockHotel
        ? (descSnippet
            ? `${descSnippet.slice(0, 200)}${descSnippet.length > 200 ? "…" : ""}`
            : base.description)
        : base.description,
    },
  };

  return createLocalizedRouteMetadata(config, locale, path, {
    ...(isDuffelStays ? { robots: { index: false, follow: true } } : {}),
  });
}

export default async function HotelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const raw = id.trim();
  const decoded = decodeURIComponent(raw);
  const returnPath = buildDetailReturnPath(
    decoded ? `/hotels/${encodeURIComponent(raw)}` : "/hotels",
    sp,
  );
  const detailPath = returnPath.replace(`/${locale}`, "") || `/hotels/${encodeURIComponent(raw)}`;
  const userId = await requireCustomerLogin(locale, returnPath);

  if (decoded) {
    const isDuffel = isDuffelStaysSearchResultRouteId(decoded);
    const mockHotel = !isDuffel ? MOCK_HOTELS.find((h) => String(h.id) === decoded) : undefined;

    let tripSnapshot = mockHotel
      ? buildMinimalHotelSnapshot({
          productRef: decoded,
          detailPath,
          hotelName: mockHotel.name,
          locationLabel: mockHotel.address,
        })
      : buildMinimalHotelSnapshot({ productRef: decoded, detailPath });

    if (mockHotel) {
      tripSnapshot = {
        ...tripSnapshot,
        start_date: undefined,
        price_amount: String(mockHotel.price),
        price_currency: mockHotel.currency,
      };
    } else if (isDuffel && isDuffelConfigured()) {
      try {
        const rates = await runStaysFetchAllRates(decoded);
        const loc = [
          rates.accommodation.location.city,
          rates.accommodation.location.country_code,
        ]
          .filter(Boolean)
          .join(", ");
        tripSnapshot = buildHotelTripSnapshotFromRates(rates, {
          productRef: decoded,
          detailPath,
          destinationLabel: loc || undefined,
        });
      } catch {
        // client will enrich after rates load
      }
    }

    trackJourneyEvent({
      userId,
      eventType: "product.viewed",
      productType: "hotel",
      productRef: decoded,
      stage: "viewed",
      tripSnapshot,
      title: tripSnapshot.hotel_name ?? mockHotel?.name ?? null,
      subtitle: formatRouteLabel(tripSnapshot),
      priceAmount: tripSnapshot.price_amount ?? (mockHotel ? String(mockHotel.price) : null),
      priceCurrency: tripSnapshot.price_currency ?? mockHotel?.currency ?? null,
    });
  }

  return <HotelDetailPageClient />;
}
