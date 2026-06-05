import "server-only";

import { isDuffelConfigured } from "@/lib/duffel/config";
import {
  buildFlightTripSnapshot,
  buildHotelTripSnapshotFromRates,
  formatRouteLabel,
  type JourneyTripSnapshot,
} from "@/lib/journey/journey-trip-snapshot";
import { tripSnapshotPatchFromFlightSearchSession } from "@/lib/journey/flight-search-session-snapshot";
import { prisma } from "@/lib/prisma";
import { refreshFlightOffer } from "@/lib/services/flights/flights-offer.service";
import { resolveFreshStaysQuote } from "@/lib/services/stays/stays-quote-lifecycle.service";
import { runStaysFetchAllRates } from "@/lib/services/stays/stays-rates.service";
import { trackJourneyEvent } from "@/lib/services/journey/customer-journey.service";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function trackFlightCheckoutStarted(input: {
  userId: string;
  sp: Record<string, string | string[] | undefined>;
}): void {
  const offerId = firstParam(input.sp.offer_id)?.trim();
  if (!offerId) return;

  const searchSessionId = firstParam(input.sp.search_session)?.trim() || null;

  void (async () => {
    let tripSnapshot = null;
    let searchPatch = null;

    if (searchSessionId) {
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
        const offer = await refreshFlightOffer(offerId);
        tripSnapshot = buildFlightTripSnapshot(offer, {
          productRef: offerId,
          searchSessionId,
          detailPath: `/flights/payment?offer_id=${encodeURIComponent(offerId)}${searchSessionId ? `&search_session=${encodeURIComponent(searchSessionId)}` : ""}`,
          searchParamsPatch: searchPatch ?? undefined,
        });
      } catch {
        // minimal
      }
    }

    if (!tripSnapshot) {
      tripSnapshot = {
        version: 1,
        product_type: "flight",
        product_ref: offerId,
        search_session_id: searchSessionId ?? undefined,
        ...(searchPatch ?? {}),
      } satisfies JourneyTripSnapshot;
    }

    trackJourneyEvent({
      userId: input.userId,
      eventType: "checkout.started",
      productType: "flight",
      productRef: offerId,
      stage: "checkout_started",
      tripSnapshot,
      title: tripSnapshot.airline ?? null,
      subtitle: formatRouteLabel(tripSnapshot),
      priceAmount: tripSnapshot.price_amount ?? null,
      priceCurrency: tripSnapshot.price_currency ?? null,
    });
  })();
}

export function trackHotelCheckoutStarted(input: {
  userId: string;
  sp: Record<string, string | string[] | undefined>;
}): void {
  const quoteId = firstParam(input.sp.quote_id)?.trim();
  const searchResultId = firstParam(input.sp.search_result_id)?.trim();
  const productRef = searchResultId || quoteId;
  if (!productRef) return;

  void (async () => {
    let tripSnapshot: Partial<JourneyTripSnapshot> = {
      version: 1,
      product_type: "hotel",
      product_ref: productRef,
      quote_id: quoteId,
      detail_path: searchResultId
        ? `/hotels/payment?quote_id=${encodeURIComponent(quoteId ?? "")}&search_result_id=${encodeURIComponent(searchResultId)}`
        : `/hotels/payment?quote_id=${encodeURIComponent(quoteId ?? "")}`,
    };

    if (quoteId && isDuffelConfigured()) {
      try {
        const quote = await resolveFreshStaysQuote({ quoteId });
        tripSnapshot = {
          ...tripSnapshot,
          quote_id: quote.quote_id,
          price_amount: quote.total_amount ?? undefined,
          price_currency: quote.total_currency ?? undefined,
        };
      } catch {
        // keep minimal
      }
    }

    if (searchResultId && isDuffelConfigured()) {
      try {
        const rates = await runStaysFetchAllRates(searchResultId);
        const enriched = buildHotelTripSnapshotFromRates(rates, {
          productRef: searchResultId,
          quoteId: tripSnapshot?.quote_id,
          priceAmount: tripSnapshot?.price_amount,
          priceCurrency: tripSnapshot?.price_currency,
        });
        tripSnapshot = { ...tripSnapshot, ...enriched, product_ref: searchResultId };
      } catch {
        // keep quote-only snapshot
      }
    }

    trackJourneyEvent({
      userId: input.userId,
      eventType: "checkout.started",
      productType: "hotel",
      productRef: productRef,
      stage: "checkout_started",
      tripSnapshot,
      title: tripSnapshot?.hotel_name ?? null,
      subtitle: tripSnapshot ? formatRouteLabel({ ...tripSnapshot, product_type: "hotel" } as JourneyTripSnapshot) : null,
      priceAmount: tripSnapshot?.price_amount ?? null,
      priceCurrency: tripSnapshot?.price_currency ?? null,
    });
  })();
}
