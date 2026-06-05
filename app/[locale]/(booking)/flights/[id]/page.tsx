import type { Metadata } from "next";
import {
  createLocalizedRouteMetadata,
  getLocalizedRouteMetadata,
} from "@/config/metadata.config";
import {
  buildDetailReturnPath,
  requireCustomerLogin,
  searchSessionFromParams,
} from "@/lib/auth/require-customer-login";
import { isDuffelConfigured } from "@/lib/duffel/config";
import {
  buildFlightTripSnapshot,
  formatRouteLabel,
} from "@/lib/journey/journey-trip-snapshot";
import { tripSnapshotPatchFromFlightSearchSession } from "@/lib/journey/flight-search-session-snapshot";
import { prisma } from "@/lib/prisma";
import { refreshFlightOffer } from "@/lib/services/flights/flights-offer.service";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import FlightDetailPageClient from "./FlightDetailPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const safeId = id.trim();
  const path = safeId ? `/flights/${encodeURIComponent(safeId)}` : "/flights";
  const base = await getLocalizedRouteMetadata(locale, "/flights");
  const config = {
    ...base,
    title: "Flight offer details",
    description: "Review this flight offer and continue to booking on TravelTourUp.",
    openGraph: {
      title: "Flight offer details",
      description: base.description,
    },
  };
  return createLocalizedRouteMetadata(config, locale, path, {
    robots: { index: false, follow: true },
  });
}

export default async function FlightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const safeId = id.trim();
  const returnPath = buildDetailReturnPath(
    safeId ? `/flights/${encodeURIComponent(safeId)}` : "/flights",
    sp,
  );
  const userId = await requireCustomerLogin(locale, returnPath);
  const searchSessionId = searchSessionFromParams(sp);

  if (safeId) {
    let tripSnapshot: ReturnType<typeof buildFlightTripSnapshot> | null = null;
    let searchPatch: ReturnType<typeof tripSnapshotPatchFromFlightSearchSession> = null;

    if (searchSessionId) {
      void prisma.flightSearchSession
        .updateMany({
          where: { id: searchSessionId, user_id: null },
          data: { user_id: userId },
        })
        .catch(() => undefined);

      const session = await prisma.flightSearchSession
        .findUnique({
          where: { id: searchSessionId },
          select: { params_json: true },
        })
        .catch(() => null);
      if (session?.params_json) {
        searchPatch = tripSnapshotPatchFromFlightSearchSession(session.params_json);
      }
    }

    if (isDuffelConfigured()) {
      try {
        const offer = await refreshFlightOffer(safeId);
        tripSnapshot = buildFlightTripSnapshot(offer, {
          productRef: safeId,
          searchSessionId,
          detailPath: returnPath.replace(`/${locale}`, "") || `/flights/${encodeURIComponent(safeId)}`,
          searchParamsPatch: searchPatch ?? undefined,
        });
      } catch {
        // minimal snapshot below
      }
    }

    if (!tripSnapshot) {
      tripSnapshot = {
        version: 1,
        product_type: "flight",
        product_ref: safeId,
        detail_path: returnPath.replace(`/${locale}`, "") || `/flights/${encodeURIComponent(safeId)}`,
        search_session_id: searchSessionId ?? undefined,
        ...(searchPatch ?? {}),
      };
    }

    trackJourneyEvent({
      userId,
      eventType: "product.viewed",
      productType: "flight",
      productRef: safeId,
      stage: "viewed",
      tripSnapshot,
      title: tripSnapshot.airline ?? null,
      subtitle: formatRouteLabel(tripSnapshot),
      priceAmount: tripSnapshot.price_amount ?? null,
      priceCurrency: tripSnapshot.price_currency ?? null,
    });
  }

  return <FlightDetailPageClient />;
}
