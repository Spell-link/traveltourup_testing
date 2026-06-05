"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  postFlightSearchDeduped,
  getFlightSearchSessionOffersDeduped,
} from "@/lib/http/flights.client";
import {
  flightSessionIdStorageKey,
  stableFlightSearchBodyKey,
} from "@/lib/flights/flight-search-body-stable";
import {
  flightSearchBodyFromUrl,
  describeSearchRoute,
  tripTypeFromUrl,
} from "@/lib/flights/search-from-url";
import { persistFlightSearchPath } from "@/lib/flights/flight-search-url-session";
import { buildFlightEditSearchSummary } from "@/lib/flights/flight-edit-search-summary";
import {
  flightOfferToListDisplay,
  flightOfferToListDisplayForSlice,
  clusterOffersByOutboundSlice,
  sliceFingerprintForRoundTrip,
  type FlightListDisplay,
} from "@/lib/flights/list-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { Filter, X, LayoutGrid, List, ChevronLeft, ChevronRight, Info, Luggage, Shield, CalendarCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import { useComparison, GenericComparison } from "../shared/GenericComparison";
import { createFlightComparisonConfig } from "../shared/ComparisonConfigs";
import { FlightListSearchSkeleton } from "@/components/flights/FlightSkeletons";
import {
  FlightResultsFilterSidebar,
  FLIGHT_SORT_IDS,
  type FlightSortId,
  type StopsFilterMode,
} from "@/components/flights/results/FlightResultsFilterSidebar";
import { FlightResultCard, type FlightResultComparisonApi } from "@/components/flights/results/FlightResultCard";
import {
  FLIGHT_RESULTS_PAGE_SIZE,
  getFlightResultsPaginationRange,
} from "@/components/flights/results/flight-results-pagination";
import FlightsTab from "@/components/flights/FlightsTab";
import { FlightChangeModeBanner } from "@/components/flights/change/FlightChangeModeBanner";
import { OriginalBookingCard } from "@/components/flights/change/OriginalBookingCard";
import { useFlightChangeResults } from "@/components/flights/useFlightChangeResults";
import type { FlightFlowContext } from "@/lib/flights/flight-flow-context";
import { isChangeFlightFlow, NEW_BOOKING_FLOW } from "@/lib/flights/flight-flow-context";
import type { OriginalBookingContext } from "@/lib/flights/flow-variant";
import type { FlightChangeListDisplay } from "@/lib/flights/order-change-list-display";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin_ui/ui/dialog";

function timeStrToMinutes(t: string): number | null {
  if (!t || !t.includes(":")) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isoToMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

const SORT_IDS = [...FLIGHT_SORT_IDS];

type FlightListProps = {
  flowContext?: FlightFlowContext;
};

const PLACEHOLDER_CHANGE_BOOKING = {} as OriginalBookingContext;

function stopsAllowed(stops: number, mode: string): boolean {
  if (mode === "any") return true;
  if (mode === "direct") return stops === 0;
  if (mode === "one") return stops === 1;
  if (mode === "two") return stops === 2;
  return true;
}

const EMPTY_COMPARISON: FlightResultComparisonApi = {
  isSelected: () => false,
  toggleItem: () => {},
};

function hasCachedFlightOffers(queryString: string): boolean {
  const body = flightSearchBodyFromUrl(new URLSearchParams(queryString));
  if (!body) return false;
  try {
    const stableKey = stableFlightSearchBodyKey(body);
    const sidKey = flightSessionIdStorageKey(stableKey);
    const offersKey = `offers:${sidKey}`;
    const rawOffers = sessionStorage.getItem(offersKey);
    if (!rawOffers) return false;
    const parsed = JSON.parse(rawOffers) as unknown;
    if (!Array.isArray(parsed)) return false;
    return Boolean(sessionStorage.getItem(sidKey)?.trim());
  } catch {
    return false;
  }
}

function initialSearchLoading(queryString: string, isChange: boolean): boolean {
  if (isChange) return false;
  const body = flightSearchBodyFromUrl(new URLSearchParams(queryString));
  if (!body) return false;
  return !hasCachedFlightOffers(queryString);
}

const FlightList = ({ flowContext = NEW_BOOKING_FLOW }: FlightListProps) => {
  const isChange = isChangeFlightFlow(flowContext);
  const changeCtx = isChange ? flowContext : null;
  const locale = useLocale();
  const rtl = isRtlLocale(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const tResults = useTranslations("Flights.results");
  const tFilters = useTranslations("Flights.filters");
  const tChange = useTranslations("Flights.change");
  const ft = useTranslations("Flights.tab");
  const [editSearchOpen, setEditSearchOpen] = useState(false);

  const changeResults = useFlightChangeResults(
    changeCtx?.bookingId ?? "",
    changeCtx?.originalBooking ?? PLACEHOLDER_CHANGE_BOOKING,
    { enabled: isChange },
  );

  /** Semantic search identity — unchanged when only `[locale]` changes → no refetch on language switch. */
  const stableSearchKey = useMemo(() => {
    const body = flightSearchBodyFromUrl(new URLSearchParams(queryString));
    return body ? stableFlightSearchBodyKey(body) : "";
  }, [queryString]);

  useEffect(() => {
    if (isChange || !queryString) return;
    persistFlightSearchPath(`/flights?${queryString}`);
  }, [queryString, isChange]);

  const hasFetchedRef = useRef(false);

  const [flights, setFlights] = useState<FlightListDisplay[]>([]);
  const [offerDtos, setOfferDtos] = useState<FlightOfferDTO[]>([]);
  const [searchSessionId, setSearchSessionId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => initialSearchLoading(queryString, isChange));
  const [sortBy, setSortBy] = useState<FlightSortId>(() => {
    const s = searchParams.get("sort");
    return s && SORT_IDS.includes(s as FlightSortId) ? (s as FlightSortId) : "best";
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isSmUp, setIsSmUp] = useState<boolean | undefined>(undefined);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const skipScrollOnMountRef = useRef(true);

  const [priceMax, setPriceMax] = useState(5000);
  const [priceSliderCap, setPriceSliderCap] = useState(5000);
  const [stopsMode, setStopsMode] = useState<StopsFilterMode>("any");
  const [selectedAirline, setSelectedAirline] = useState("");
  const [flightNumberQuery, setFlightNumberQuery] = useState("");
  const [depTimeFrom, setDepTimeFrom] = useState("");
  const [depTimeTo, setDepTimeTo] = useState("");
  const [arrTimeFrom, setArrTimeFrom] = useState("");
  const [arrTimeTo, setArrTimeTo] = useState("");

  const [rtStep, setRtStep] = useState<"outbound" | "inbound">("outbound");
  const [selectedOutboundKey, setSelectedOutboundKey] = useState<string | null>(null);

  const tripType = useMemo(() => tripTypeFromUrl(searchParams), [searchParams]);
  const isRoundTrip = tripType === "round_trip";

  const flightEditSearchSummary = useMemo(
    () =>
      buildFlightEditSearchSummary(queryString, locale, {
        titleRoundTrip: (v) => tResults("editSearchTitleRoundTrip", v),
        titleOneWay: (v) => tResults("editSearchTitleOneWay", v),
        titleMultiCity: () => tResults("editSearchTitleMultiCity"),
        routeRound: (v) => tResults("editSearchRouteRound", v),
        routeOneWay: (v) => tResults("editSearchRouteOneWay", v),
        datesRound: (v) => tResults("editSearchDatesRound", v),
        datesOneWay: (v) => tResults("editSearchDatesOneWay", v),
        datesMultiCity: (v) => tResults("editSearchDatesMultiCity", v),
        passengers: (v) => tResults("editSearchPassengers", v),
      }, (key) => ft(key)),
    [queryString, locale, tResults, ft],
  );

  useEffect(() => {
    setEditSearchOpen(false);
  }, [queryString]);

  const priceSubtitle = isRoundTrip ? tResults("roundTripTotal") : tResults("oneWayTotal");

  const sortFromUrl = searchParams.get("sort");
  useEffect(() => {
    if (sortFromUrl && SORT_IDS.includes(sortFromUrl as FlightSortId)) {
      setSortBy(sortFromUrl as FlightSortId);
    }
  }, [sortFromUrl]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const onChange = () => setIsSmUp(mql.matches);
    mql.addEventListener("change", onChange);
    setIsSmUp(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!showMobileFilters) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, [showMobileFilters]);

  /** Overlay uses `lg:hidden`; if viewport crosses to lg while open, body scroll stays locked unless we reset. */
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const closeWhenDesktopLayout = () => {
      if (mql.matches) setShowMobileFilters(false);
    };
    closeWhenDesktopLayout();
    mql.addEventListener("change", closeWhenDesktopLayout);
    return () => mql.removeEventListener("change", closeWhenDesktopLayout);
  }, []);

  const showGrid =
    isSmUp === undefined ? viewMode === "grid" : !isSmUp || viewMode === "grid";

  const pushSortToUrl = useCallback(
    (id: string) => {
      const p = new URLSearchParams(queryString);
      p.set("sort", id);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [queryString, pathname, router],
  );

  const handleSortChange = (id: FlightSortId) => {
    setSortBy(id);
    pushSortToUrl(id);
  };

  const comparison = useComparison(3);
  const resultComparison: FlightResultComparisonApi = isChange
    ? EMPTY_COMPARISON
    : {
        isSelected: (id: string) =>
          (comparison.isSelected as unknown as (itemId: string) => boolean)(id),
        toggleItem: (flight: FlightListDisplay) =>
          (comparison.toggleItem as unknown as (item: FlightListDisplay) => void)(flight),
      };
  const flightComparisonConfig = createFlightComparisonConfig();

  useEffect(() => {
    if (isChange) return;
    let cancelled = false;
    const body = flightSearchBodyFromUrl(new URLSearchParams(queryString));
    if (!body) {
      setFlights([]);
      setOfferDtos([]);
      setSearchSessionId(null);
      setFetchError(null);
      setLoading(false);
      setRtStep("outbound");
      setSelectedOutboundKey(null);
      return () => {
        cancelled = true;
      };
    }

    const sidStorageKey = flightSessionIdStorageKey(stableFlightSearchBodyKey(body));
    const offersStorageKey = `offers:${sidStorageKey}`;

    const applyOffers = (offers: FlightOfferDTO[], sessionId: string) => {
      if (cancelled) return;
      setSearchSessionId(sessionId);
      try {
        sessionStorage.setItem("flightSearchSessionId", sessionId);
        sessionStorage.setItem(sidStorageKey, sessionId);
        sessionStorage.setItem(offersStorageKey, JSON.stringify(offers));
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          try {
            sessionStorage.setItem("flightSearchSessionId", sessionId);
            sessionStorage.setItem(sidStorageKey, sessionId);
            sessionStorage.removeItem(offersStorageKey);
          } catch {
            /* ignore */
          }
        }
      }
      const rows = offers.map(flightOfferToListDisplay);
      setOfferDtos(offers);
      setFlights(rows);
      const maxP = Math.max(500, ...rows.map((r) => r.price), 1000);
      const cap = Math.ceil(maxP / 500) * 500 + 500;
      setPriceSliderCap(cap);
      setPriceMax(cap);
    };

    // (a) Cached offers — sync path, no API
    try {
      const rawOffers = sessionStorage.getItem(offersStorageKey);
      if (rawOffers) {
        const parsed = JSON.parse(rawOffers) as FlightOfferDTO[];
        if (Array.isArray(parsed)) {
          const sid = sessionStorage.getItem(sidStorageKey)?.trim();
          if (sid) {
            applyOffers(parsed, sid);
            setFetchError(null);
            setLoading(false);
            return () => {
              cancelled = true;
            };
          }
        }
      }
    } catch {
      /* ignore */
    }

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setLoading(true);
    setFetchError(null);
    setFlights([]);
    setOfferDtos([]);
    setRtStep("outbound");
    setSelectedOutboundKey(null);

    void (async () => {
      // (b) Cached session id → hydrate offers via GET (deduped)
      let cachedSid: string | null = null;
      try {
        cachedSid = sessionStorage.getItem(sidStorageKey)?.trim() ?? null;
      } catch {
        /* ignore */
      }

      if (cachedSid) {
        try {
          const hydrated = await getFlightSearchSessionOffersDeduped(cachedSid);
          if (cancelled) return;
          applyOffers(hydrated.offers, cachedSid);
          setLoading(false);
          return;
        } catch {
          try {
            sessionStorage.removeItem(sidStorageKey);
            sessionStorage.removeItem(offersStorageKey);
          } catch {
            /* ignore */
          }
        }
      }

      // (c) New search — POST (deduped only)
      try {
        const res = await postFlightSearchDeduped(body);
        if (cancelled) return;
        applyOffers(res.offers, res.search_session_id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : tResults("searchFailed");
        if (!cancelled) setFetchError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      hasFetchedRef.current = false;
    };
  }, [stableSearchKey, queryString, isChange]);

  const listFlights: FlightListDisplay[] = isChange ? changeResults.flights : flights;
  const listLoading = isChange ? changeResults.loading : loading;
  const listFetchError = isChange ? changeResults.fetchError : fetchError;

  useEffect(() => {
    if (!isChange || changeResults.flights.length === 0) return;
    const maxP = Math.max(500, ...changeResults.flights.map((r) => r.price), 1000);
    const cap = Math.ceil(maxP / 500) * 500 + 500;
    setPriceSliderCap(cap);
    setPriceMax(cap);
  }, [isChange, changeResults.flights]);

  const rtClusters = useMemo(() => {
    if (!isRoundTrip || offerDtos.length === 0) return [];
    return clusterOffersByOutboundSlice(offerDtos);
  }, [isRoundTrip, offerDtos]);

  const inboundRows: FlightListDisplay[] = useMemo(() => {
    if (!selectedOutboundKey || !isRoundTrip) return [];
    return offerDtos
      .filter((o) => {
        const s0 = o.slices[0];
        if (!s0 || o.slices.length < 2) return false;
        return sliceFingerprintForRoundTrip(s0) === selectedOutboundKey;
      })
      .map((o) => flightOfferToListDisplayForSlice(o, 1))
      .sort((a, b) => a.price - b.price);
  }, [offerDtos, selectedOutboundKey, isRoundTrip]);

  const baseRowsForFilters = useMemo(() => {
    if (isRoundTrip && rtStep === "outbound" && rtClusters.length > 0) {
      return rtClusters.map((c) => c.display);
    }
    if (isRoundTrip && rtStep === "inbound" && inboundRows.length > 0) {
      return inboundRows;
    }
    return flights;
  }, [isRoundTrip, rtStep, rtClusters, inboundRows, flights, isChange, listFlights]);

  const rowsForFilters = isChange ? listFlights : baseRowsForFilters;

  const airlineOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of rowsForFilters) {
      const code = f.airlineCode?.trim();
      if (!code || code === "—") continue;
      const name = f.airlineName ?? f.airline;
      if (!m.has(code)) m.set(code, name);
    }
    return [...m.entries()].map(([code, name]) => ({ code, name }));
  }, [rowsForFilters]);

  const filteredFlights = useMemo(() => {
    let result = [...rowsForFilters];

    result = result.filter((f) => f.price >= 0 && f.price <= priceMax);

    if (selectedAirline) {
      result = result.filter((f) => f.airlineCode === selectedAirline);
    }
   
    result = result.filter((f) => stopsAllowed(f.stops, stopsMode));

    const fnq = flightNumberQuery.replace(/\s+/g, "").trim();
    if (fnq) {
      result = result.filter((f) => f.flightNumbersSearch.includes(fnq.toUpperCase()));
    }

    const dF = timeStrToMinutes(depTimeFrom);
    const dT = timeStrToMinutes(depTimeTo);
    const aF = timeStrToMinutes(arrTimeFrom);
    const aT = timeStrToMinutes(arrTimeTo);
    if (dF != null || dT != null || aF != null || aT != null) {
      result = result.filter((f) => {
        const dm = isoToMinutes(f.firstDepartingAt);
        const am = isoToMinutes(f.lastArrivingAt);
        if (dF != null && dm != null && dm < dF) return false;
        if (dT != null && dm != null && dm > dT) return false;
        if (aF != null && am != null && am < aF) return false;
        if (aT != null && am != null && am > aT) return false;
        return true;
      });
    }

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "duration_asc":
        result.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "duration_desc":
        result.sort((a, b) => b.durationMinutes - a.durationMinutes);
        break;
      default:
        result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [
    rowsForFilters,
    priceMax,
    selectedAirline,
    stopsMode,
    flightNumberQuery,
    depTimeFrom,
    depTimeTo,
    arrTimeFrom,
    arrTimeTo,
    sortBy,
  ]);

  const filterKey = useMemo(
    () =>
      [
        priceMax,
        selectedAirline,
        stopsMode,
        flightNumberQuery,
        depTimeFrom,
        depTimeTo,
        arrTimeFrom,
        arrTimeTo,
        sortBy,
        rtStep,
        selectedOutboundKey,
      ].join("|"),
    [
      priceMax,
      selectedAirline,
      stopsMode,
      flightNumberQuery,
      depTimeFrom,
      depTimeTo,
      arrTimeFrom,
      arrTimeTo,
      sortBy,
      rtStep,
      selectedOutboundKey,
    ],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [queryString, filterKey]);

  const totalPages = useMemo(() => {
    if (filteredFlights.length === 0) return 0;
    return Math.ceil(filteredFlights.length / FLIGHT_RESULTS_PAGE_SIZE);
  }, [filteredFlights.length]);

  const displayPage = useMemo(() => {
    if (totalPages === 0) return 1;
    return Math.min(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const paginatedFlights = useMemo(() => {
    const start = (displayPage - 1) * FLIGHT_RESULTS_PAGE_SIZE;
    return filteredFlights.slice(start, start + FLIGHT_RESULTS_PAGE_SIZE);
  }, [filteredFlights, displayPage]);

  useEffect(() => {
    if (totalPages === 0) return;
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginationItems = useMemo(
    () => (totalPages > 1 ? getFlightResultsPaginationRange(displayPage, totalPages) : []),
    [displayPage, totalPages],
  );

  useEffect(() => {
    if (skipScrollOnMountRef.current) {
      skipScrollOnMountRef.current = false;
      return;
    }
    if (listLoading) return;
    resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [displayPage, listLoading]);

  const clearAllFilters = () => {
    setPriceMax(priceSliderCap);
    setStopsMode("any");
    setSelectedAirline("");
    setFlightNumberQuery("");
    setDepTimeFrom("");
    setDepTimeTo("");
    setArrTimeFrom("");
    setArrTimeTo("");
  };

  const detailHref = (offerId: string) => {
    if (isChange) return changeResults.detailHref(offerId);
    const q = searchSessionId
      ? `?search_session=${encodeURIComponent(searchSessionId)}`
      : "";
    return `/flights/${offerId}${q}`;
  };

  const changeRow = (flight: FlightListDisplay): FlightChangeListDisplay | undefined =>
    isChange ? (flight as FlightChangeListDisplay) : undefined;

  const sidebar = (
    <FlightResultsFilterSidebar
      sortBy={sortBy}
      onSortChange={(id) => handleSortChange(id as FlightSortId)}
      priceMax={priceMax}
      priceSliderMax={priceSliderCap}
      onPriceMaxChange={setPriceMax}
      stopsMode={stopsMode}
      onStopsModeChange={setStopsMode}
      airlineOptions={airlineOptions}
      selectedAirline={selectedAirline}
      onAirlineChange={setSelectedAirline}
      flightNumberQuery={flightNumberQuery}
      onFlightNumberChange={setFlightNumberQuery}
      depTimeFrom={depTimeFrom}
      depTimeTo={depTimeTo}
      onDepTimeFrom={setDepTimeFrom}
      onDepTimeTo={setDepTimeTo}
      arrTimeFrom={arrTimeFrom}
      arrTimeTo={arrTimeTo}
      onArrTimeFrom={setArrTimeFrom}
      onArrTimeTo={setArrTimeTo}
      onClearAll={clearAllFilters}
      editSearchSummary={isChange ? changeResults.editSearchSummary : flightEditSearchSummary}
      onEditSearch={() => setEditSearchOpen(true)}
      onFlightSearchStart={() => {
        setEditSearchOpen(false);
        setShowMobileFilters(false);
      }}
    />
  );

  const importantInfoIcon = (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
      <Info className="h-6 w-6 text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      <GenericComparison
        items={flights as unknown as Parameters<typeof GenericComparison>[0]["items"]}
        selectedItems={comparison.selectedItems}
        config={flightComparisonConfig}
        isModalOpen={comparison.showModal}
        onToggleItem={comparison.toggleItem}
        onClearAll={comparison.clearAll}
        onOpenModal={comparison.openModal}
        onCloseModal={comparison.closeModal}
      />

      <Dialog open={editSearchOpen} onOpenChange={setEditSearchOpen}>
        <DialogContent className="max-h-[92vh] max-w-[min(100vw-1rem,56rem)] gap-0 rounded-xl border-none bg-background p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>{tResults("editSearchModalTitle")}</DialogTitle>
          </DialogHeader>
          <div className=" pr-1">
            <FlightsTab
              variant="modal"
              flowVariant={isChange ? "change-flight" : "new-booking"}
              originalBooking={changeCtx?.originalBooking}
              onFlightSearchStart={() => {
                setEditSearchOpen(false);
                setShowMobileFilters(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-muted shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-4 py-3">
          <div className="flex flex-col gap-2">
            {isChange && changeCtx ? (
              <FlightChangeModeBanner
                bookingRefNo={changeCtx.originalBooking.bookingRefNo}
                bookingId={changeCtx.bookingId}
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold">
                {isChange ? changeResults.routeTitle : describeSearchRoute(searchParams).title}
              </h1>
              <p className="text-muted-foreground">
                {isChange
                  ? changeResults.params
                    ? `${changeResults.params.departure_date} · ${tChange("compareHint")}`
                    : null
                  : describeSearchRoute(searchParams).subtitle}
              </p>
              {listFetchError ? (
                <p className="text-destructive text-sm mt-2" role="alert">
                  {listFetchError}
                </p>
              ) : null}
            </div>
            {isRoundTrip && !isChange && rtClusters.length > 0 ? (
              <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label={tResults("roundTripSteps")}>
                <button
                  type="button"
                  onClick={() => {
                    setRtStep("outbound");
                    setSelectedOutboundKey(null);
                  }}
                  className={`rounded-lg px-3 py-1 font-medium ${
                    rtStep === "outbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-input"
                  }`}
                >
                  {tResults("outbound")}
                </button>
                <span className="text-muted-foreground">→</span>
                <span
                  className={`rounded-lg px-3 py-1 font-medium ${
                    rtStep === "inbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-transparent"
                  }`}
                >
                  {tResults("returnStep")}
                </span>
                {rtStep === "inbound" && selectedOutboundKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRtStep("outbound");
                      setSelectedOutboundKey(null);
                    }}
                    className="ml-auto text-primary text-sm font-semibold hover:underline"
                  >
                    {tResults("changeOutbound")}
                  </button>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between py-2">
          <div className="text-muted-foreground text-sm sm:text-base">
            {listLoading ? (
              <span>{tResults("loadingResults")}</span>
            ) : filteredFlights.length === 0 ? (
              <span>{queryString ? (isChange ? tChange("noOffers") : tResults("noMatching")) : "—"}</span>
            ) : (
              <span>
                {tResults("showingRange", {
                  start: (displayPage - 1) * FLIGHT_RESULTS_PAGE_SIZE + 1,
                  end: Math.min(displayPage * FLIGHT_RESULTS_PAGE_SIZE, filteredFlights.length),
                  total: filteredFlights.length,
                })}
              </span>
            )}
          </div>
          <div className="hidden sm:flex rounded-lg border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              }`}
              aria-label={tResults("listView")}
              aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              }`}
              aria-label={tResults("gridView")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4 hidden lg:block">{sidebar}</div>
          <div className="lg:hidden mb-4">
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold flex items-center justify-center"
            >
              <Filter className="mr-2" aria-hidden />
              {tResults("filtersSortButton")}
            </button>
          </div>
          {showMobileFilters ? (
            <div
              className="dark fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col bg-card text-card-foreground lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={tFilters("title")}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                <h2 className="text-xl font-bold text-foreground">{tFilters("title")}</h2>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-lg p-1 text-foreground hover:bg-muted"
                  aria-label={tResults("editSearchCancel")}
                >
                  <X className="h-6 w-6" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 dropdown-scrollbar">
                {sidebar}
              </div>
              <div className="shrink-0 border-t border-border bg-card p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground"
                >
                  {tResults("done")}
                </button>
              </div>
            </div>
          ) : null}

          <div ref={resultsAnchorRef} id="flight-results" className="lg:w-3/4 scroll-mt-24">
            {isChange && changeCtx ? (
              <div className="mb-6">
                <OriginalBookingCard
                  flight={changeCtx.originalBooking.flight}
                  bookingRefNo={changeCtx.originalBooking.bookingRefNo}
                  totalAmount={changeCtx.originalBooking.totalAmount}
                  currency={changeCtx.originalBooking.currency}
                />
              </div>
            ) : null}
            {listLoading ? (
              <FlightListSearchSkeleton
                rows={showGrid ? 6 : 5}
                variant={showGrid ? "grid" : "list"}
              />
            ) : !queryString ? (
              <div className="bg-card rounded-xl shadow-lg p-8 text-center text-muted-foreground">
                <p className="text-lg font-medium text-foreground mb-2">{tResults("startSearchTitle")}</p>
                <p>{tResults("startSearchBody")}</p>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="bg-card rounded-xl shadow-lg p-8 text-center">
                <X className="text-4xl text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{tResults("noFlightsTitle")}</h3>
                <p className="text-muted-foreground mb-4">{tResults("noFlightsBody")}</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold"
                >
                  {tResults("clearFilters")}
                </button>
              </div>
            ) : (
              <>
                {showGrid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedFlights.map((flight) => {
                      const isCluster =
                        isRoundTrip && rtStep === "outbound" && flight.id.startsWith("cluster:");
                      return (
                        <FlightResultCard
                          key={flight.id}
                          flight={flight}
                          variant="grid"
                          comparison={resultComparison}
                          priceSubtitle={isChange ? tChange("changeFeeLabel") : priceSubtitle}
                          selectHref={isCluster ? undefined : detailHref(flight.id)}
                          hideComparison={Boolean(isCluster) || isChange}
                          changeDelta={changeRow(flight)?.changeDelta}
                          onSelect={
                            isCluster
                              ? () => {
                                  setSelectedOutboundKey(flight.id.slice("cluster:".length));
                                  setRtStep("inbound");
                                }
                              : isChange
                                ? () => changeResults.onSelectOffer(flight.id)
                                : undefined
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  paginatedFlights.map((flight) => {
                    const isCluster =
                      isRoundTrip && rtStep === "outbound" && flight.id.startsWith("cluster:");
                    return (
                      <FlightResultCard
                        key={flight.id}
                        flight={flight}
                        variant="list"
                        comparison={resultComparison}
                        priceSubtitle={isChange ? tChange("changeFeeLabel") : priceSubtitle}
                        selectHref={isCluster ? undefined : detailHref(flight.id)}
                        hideComparison={Boolean(isCluster) || isChange}
                        changeDelta={changeRow(flight)?.changeDelta}
                        onSelect={
                          isCluster
                            ? () => {
                                setSelectedOutboundKey(flight.id.slice("cluster:".length));
                                setRtStep("inbound");
                              }
                            : isChange
                              ? () => changeResults.onSelectOffer(flight.id)
                              : undefined
                        }
                      />
                    );
                  })
                )}
                {totalPages > 1 ? (
                  <nav
                    className="mt-8 flex flex-col gap-4 border-t border-border sm:pt-6 sm:flex-row sm:items-center sm:justify-between"
                    aria-label={tResults("paginationNav")}
                  >
                    <p className="text-center text-sm text-muted-foreground sm:text-left">
                      {tResults("paginationPage", { page: displayPage, total: totalPages })}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={displayPage <= 1}
                        className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
                        aria-label={tResults("prevPage")}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {paginationItems.map((item, idx) =>
                        item === "ellipsis" ? (
                          <span key={`e-${idx}`} className="flex h-10 w-10 items-center justify-center">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm ${
                              displayPage === item
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-card hover:bg-muted"
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={displayPage >= totalPages}
                        className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border border-input bg-card px-3 text-sm shadow-sm hover:bg-muted disabled:opacity-50"
                        aria-label={tResults("nextPage")}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </div>

        <section className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card px-5 py-8 shadow-md sm:px-8 sm:py-10">
          <div
            className={cn(
              "mb-8 flex items-center gap-3",
              rtl && "justify-end",
            )}
          >
            {!rtl && importantInfoIcon}
            <div dir={rtlDirProp(locale)} className={rtl ? rtlTypographyClass(locale) : undefined}>
              <h3 className="text-xl font-bold text-foreground sm:text-2xl">{tResults("importantTitle")}</h3>
              <p className="text-sm text-muted-foreground">{tResults("importantSubtitle")}</p>
            </div>
            {rtl && importantInfoIcon}
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-border bg-background/80 p-6 text-center">
              <Luggage className="h-7 w-7 text-primary mx-auto mb-3" />
              <h4 className="mb-2 font-bold">{tResults("baggageTitle")}</h4>
              <p className="text-sm text-muted-foreground">{tResults("baggageBody")}</p>
            </article>
            <article className="rounded-2xl border border-border bg-background/80 p-6 text-center">
              <Shield className="h-7 w-7 text-primary mx-auto mb-3" />
              <h4 className="mb-2 font-bold">{tResults("requirementsTitle")}</h4>
              <p className="text-sm text-muted-foreground">{tResults("requirementsBody")}</p>
            </article>
            <article className="rounded-2xl border border-border bg-background/80 p-6 text-center">
              <CalendarCheck className="h-7 w-7 text-primary mx-auto mb-3" />
              <h4 className="mb-2 font-bold">{tResults("flexibleTitle")}</h4>
              <p className="text-sm text-muted-foreground">{tResults("flexibleBody")}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FlightList;
