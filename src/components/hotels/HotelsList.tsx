// @ts-nocheck - Phase 1: Complex component; full typing in Phase 3
"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Wifi,
  Waves,
  Car,
  Sparkles,
  Dumbbell,
  Coffee,
  PlaneTakeoff,
  UtensilsCrossed,
  Beer,
  Snowflake,
  Briefcase,
  Shirt,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Star,
  Check,
  X,
  Bed,
  MapPin,
  Navigation,
  TrendingUp,
  Navigation2,
  LayoutGrid,
  List,
} from "lucide-react";
import { staysSearchCardToMockHotel } from "@/lib/stays/stays-ui-map";
import { Input } from "@/components/ui/Input";
import {
  useComparison,
  ComparisonCheckbox,

  GenericComparison
} from "../shared/GenericComparison";
import { createHotelComparisonConfig } from "../shared/ComparisonConfigs";
import DualSlider from "@/components/ui/DualSlider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import HotelMapModal from "./HotelMapModal";
import { WishlistToggle } from "@/components/wishlist/WishlistToggle";
import { HotelSearchResultSkeleton } from "@/components/hotels/HotelSearchResultSkeleton";
import {
  TTU_STAYS_SEARCH_SESSION_KEY,
  TTU_STAYS_SEARCH_PENDING_KEY,
  TTU_STAYS_SEARCH_STARTED_EVENT,
  TTU_STAYS_SEARCH_UPDATED_EVENT,
} from "@/lib/http/stays.client";
import {
  HOTEL_RESULTS_PAGE_SIZE,
  getHotelResultsPaginationRange,
} from "@/components/hotels/hotel-results-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin_ui/ui/select";
import { shouldUnoptimizeStaysSupplierImage } from "@/lib/images/stays-supplier-image";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";
import { coordsForDestinationCode } from "@/data/stay-destination-coords";
import { cn } from "@/lib/utils";
import { formatFlightSearchShortDate } from "@/lib/flights/flight-edit-search-summary";
import { EditSearchSummaryCard } from "@/components/shared/EditSearchSummaryCard";
import HotelsTab from "@/components/hotels/HotelsTab";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin_ui/ui/dialog";

/** Duffel-style radius presets (km). */
const HOTEL_SEARCH_RADIUS_KM_OPTIONS = [1, 2, 3, 5, 25] as const;
const DEFAULT_HOTEL_SEARCH_RADIUS_KM = 5;

function readStaysSearchOriginFromStorage(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  const snap = readStaysSearchFormSnapshot();
  const dest = snap?.destination;
  if (!dest) return null;
  if (dest.kind === "place") {
    return { lat: dest.latitude, lng: dest.longitude };
  }
  const c = coordsForDestinationCode(dest.code);
  return c ? { lat: c.latitude, lng: c.longitude } : null;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))));
}

function parseListedDistanceKm(distanceFromCenter: string): number | null {
  if (!distanceFromCenter || distanceFromCenter === "—") return null;
  const m = String(distanceFromCenter).match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function distanceKmForHotelFilter(
  hotel: { distanceFromCenter: string; lat: number; lng: number },
  origin: { lat: number; lng: number } | null,
): number | null {
  const lat = hotel.lat;
  const lng = hotel.lng;
  if (
    origin &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  ) {
    return haversineDistanceKm(origin.lat, origin.lng, lat, lng);
  }
  return parseListedDistanceKm(hotel.distanceFromCenter);
}

const LeafletMap = dynamic(() => import("@/components/shared/LeafLeftMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[280px] w-full animate-pulse rounded-lg border border-border bg-muted"
      aria-hidden
    />
  ),
});

const HotelBook = () => {
  const hr = useTranslations("Hotels.results");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { formatFromUsd } = useCurrency();
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  /** Until first load from sessionStorage or mock. */
  const [loading, setLoading] = useState(true);
  /** Live Stays search results use $0 / null totals until fetch_all_rates — widen price filter. */
  const [fromStaysSearch, setFromStaysSearch] = useState(false);
  const [sortBy, setSortBy] = useState('best');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSmUp, setIsSmUp] = useState<boolean | undefined>(undefined);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hotelEditSearchOpen, setHotelEditSearchOpen] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [expandedHotel, setExpandedHotel] = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const resultsAnchorRef = useRef(null);
  const skipScrollOnMountRef = useRef(true);
  const [currentPage, setCurrentPage] = useState(1);
  /** After user picks from mobile dropdown, trigger shows that label instead of "Sort by". */
  const [mobileSortChosen, setMobileSortChosen] = useState(false);

  const HOTEL_SORT_OPTIONS = useMemo(
    () => [
      { id: "best", label: hr("sort.best") },
      { id: "price_low", label: hr("sort.price_low") },
      { id: "price_high", label: hr("sort.price_high") },
      { id: "rating", label: hr("sort.rating") },
      { id: "stars", label: hr("sort.stars") },
      { id: "distance", label: hr("sort.distance") },
    ],
    [hr],
  );




  useEffect(() => {
    if (!sortMenuOpen) return;
    const close = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const onChange = () => setIsSmUp(mql.matches);
    mql.addEventListener("change", onChange);
    setIsSmUp(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const showGrid =
    isSmUp === undefined ? viewMode === "grid" : !isSmUp || viewMode === "grid";

  // Comparison state
  const comparison = useComparison(3);
  const hotelComparisonConfig = createHotelComparisonConfig();

  const HOTEL_PRICE_SLIDER_MIN = 0;
  const HOTEL_PRICE_SLIDER_MAX = 1000;

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([50, 500]);
  const [selectedStars, setSelectedStars] = useState([]);
  const [searchRadiusKm, setSearchRadiusKm] = useState(DEFAULT_HOTEL_SEARCH_RADIUS_KM);
  const [staysSearchOrigin, setStaysSearchOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const amenities = [
    { id: "wifi", name: "Free WiFi", icon: <Wifi className="w-4 h-4" />, count: 78 },
    { id: "pool", name: "Swimming Pool", icon: <Waves className="w-4 h-4" />, count: 65 },
    { id: "parking", name: "Free Parking", icon: <Car className="w-4 h-4" />, count: 72 },
    { id: "spa", name: "Spa", icon: <Sparkles className="w-4 h-4" />, count: 38 },
    { id: "gym", name: "Fitness Center", icon: <Dumbbell className="w-4 h-4" />, count: 54 },
    { id: "breakfast", name: "Free Breakfast", icon: <Coffee className="w-4 h-4" />, count: 49 },
    { id: "airport-shuttle", name: "Airport Shuttle", icon: <PlaneTakeoff className="w-4 h-4" />, count: 32 },
    { id: "restaurant", name: "Restaurant", icon: <UtensilsCrossed className="w-4 h-4" />, count: 81 },
    { id: "bar", name: "Bar/Lounge", icon: <Beer className="w-4 h-4" />, count: 67 },
    { id: "ac", name: "Air Conditioning", icon: <Snowflake className="w-4 h-4" />, count: 92 },
    { id: "business", name: "Business Center", icon: <Briefcase className="w-4 h-4" />, count: 45 },
    { id: "laundry", name: "Laundry Service", icon: <Shirt className="w-4 h-4" />, count: 58 },
  ];

  useEffect(() => {
    const loadFromSession = () => {
      try {
        const pending = sessionStorage.getItem(TTU_STAYS_SEARCH_PENDING_KEY) === "1";
        if (pending) {
          setLoading(true);
          setHotels([]);
          setFromStaysSearch(true);
          setStaysSearchOrigin(null);
          return;
        }
        const raw = sessionStorage.getItem(TTU_STAYS_SEARCH_SESSION_KEY);
        if (raw) {
          setStaysSearchOrigin(readStaysSearchOriginFromStorage());
          const j = JSON.parse(raw) as { results?: unknown[] };
          if (Array.isArray(j.results) && j.results.length > 0) {
            const mapped = j.results.map((row) =>
              staysSearchCardToMockHotel(row as Parameters<typeof staysSearchCardToMockHotel>[0]),
            );
            setFromStaysSearch(true);
            setPriceRange([HOTEL_PRICE_SLIDER_MIN, HOTEL_PRICE_SLIDER_MAX]);
            setHotels(mapped);
            setLoading(false);
            return;
          }
        } else {
          setStaysSearchOrigin(null);
        }
      } catch {
        /* ignore corrupt session */
        setStaysSearchOrigin(null);
      }
      setFromStaysSearch(false);
      setHotels([]);
      setLoading(false);
    };

    loadFromSession();
    window.addEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, loadFromSession);
    window.addEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, loadFromSession);
    return () => {
      window.removeEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, loadFromSession);
      window.removeEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, loadFromSession);
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...hotels];

    // Price filter
    result = result.filter(hotel => hotel.price >= priceRange[0] && hotel.price <= priceRange[1]);

    // Stars filter
    if (selectedStars.length > 0) {
      result = result.filter(hotel => selectedStars.includes(hotel.stars.toString()));
    }

    // Search radius (client-side; Duffel uses lat/lng + session origin; mock uses listed km)
    result = result.filter((hotel) => {
      const km = distanceKmForHotelFilter(hotel, staysSearchOrigin);
      if (km === null) return true;
      return km <= searchRadiusKm;
    });

    // Sort results
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'stars':
        result.sort((a, b) => b.stars - a.stars);
        break;
      case 'distance': {
        const n = (v: unknown) => {
          const x = parseFloat(String(v));
          return Number.isFinite(x) ? x : 0;
        };
        result.sort((a, b) => n(a.distanceFromCenter) - n(b.distanceFromCenter));
        break;
      }
      default: // best
        result.sort((a, b) => {
          // Sort by best value: combination of rating and price
          const scoreA = (a.rating * 20) - (a.price / 10);
          const scoreB = (b.rating * 20) - (b.price / 10);
          return scoreB - scoreA;
        });
    }

    setFilteredHotels(result);
  }, [hotels, priceRange, selectedStars, searchRadiusKm, staysSearchOrigin, sortBy]);

  const filterKey = useMemo(
    () =>
      [
        hotels.map((h) => h.id).join(","),
        priceRange[0],
        priceRange[1],
        selectedStars.join(","),
        searchRadiusKm,
        staysSearchOrigin ? `${staysSearchOrigin.lat},${staysSearchOrigin.lng}` : "",
        sortBy,
      ].join("|"),
    [
      hotels,
      priceRange,
      selectedStars,
      searchRadiusKm,
      staysSearchOrigin,
      sortBy,
    ],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKey]);

  const totalPages = useMemo(() => {
    if (filteredHotels.length === 0) return 0;
    return Math.ceil(filteredHotels.length / HOTEL_RESULTS_PAGE_SIZE);
  }, [filteredHotels.length]);

  const displayPage = useMemo(() => {
    if (totalPages === 0) return 1;
    return Math.min(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const paginatedHotels = useMemo(() => {
    const start = (displayPage - 1) * HOTEL_RESULTS_PAGE_SIZE;
    return filteredHotels.slice(start, start + HOTEL_RESULTS_PAGE_SIZE);
  }, [filteredHotels, displayPage]);

  useEffect(() => {
    if (totalPages === 0) return;
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginationItems = useMemo(
    () => (totalPages > 1 ? getHotelResultsPaginationRange(displayPage, totalPages) : []),
    [displayPage, totalPages],
  );

  useEffect(() => {
    if (skipScrollOnMountRef.current) {
      skipScrollOnMountRef.current = false;
      return;
    }
    if (loading) return;
    resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [displayPage, loading]);

  const handleFilterToggle = (filterType, value) => {
    if (filterType !== "stars") return;
    setSelectedStars((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handlePriceChange = (minMax: "min" | "max", raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const n = Math.max(
      HOTEL_PRICE_SLIDER_MIN,
      Math.min(HOTEL_PRICE_SLIDER_MAX, parsed)
    );
    if (minMax === "min") {
      setPriceRange([Math.min(n, priceRange[1]), priceRange[1]]);
    } else {
      setPriceRange([priceRange[0], Math.max(n, priceRange[0])]);
    }
  };

  const clearAllFilters = () => {
    setPriceRange(
      fromStaysSearch ? [HOTEL_PRICE_SLIDER_MIN, HOTEL_PRICE_SLIDER_MAX] : [50, 500],
    );
    setSelectedStars([]);
    setSearchRadiusKm(DEFAULT_HOTEL_SEARCH_RADIUS_KM);
  };

  const renderStars = (stars) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < stars ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/50"}`}
          />
        ))}
      </div>
    );
  };

  const HotelCard = ({ hotel, variant = 'list' }) => {
    const isExpanded = expandedHotel === hotel.id;
    const isGrid = variant === 'grid';
    const isSelectedForComparison = comparison.isSelected(hotel.id);

    if (isGrid) {
      return (
        <div className="bg-card rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
          <div className="p-4 flex flex-col flex-1">
            <div className="relative mb-3 h-36 overflow-hidden rounded-lg bg-muted">
              {hotel.images?.[0] ? (
                <Image
                  src={hotel.images[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  unoptimized={shouldUnoptimizeStaysSupplierImage(hotel.images[0])}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                  <Bed className="text-3xl text-primary/70" />
                </div>
              )}
              {hotel.discount > 0 && (
                <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-0.5 rounded text-xs font-bold">
                  -{hotel.discount}%
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex items-center rounded bg-primary/20 px-2 py-0.5 text-primary">
                <Star className="mr-1" />
                <span className="text-sm font-bold">{hotel.rating}</span>
              </div>
            </div>
            <h3 className="font-bold text-base hover:text-primary cursor-pointer line-clamp-2 mb-1">{hotel.name}</h3>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-muted-foreground text-xs">
                {renderStars(hotel.stars)}
              </div>
              <div className="flex items-center gap-2">
                <WishlistToggle
                  display="icon"
                  type="hotel"
                  refId={String(hotel.id)}
                  title={hotel.name}
                  subtitle={hotel.area || hotel.address}
                  imageUrl={hotel.images?.[0] ?? null}
                />
                <ComparisonCheckbox
                  isSelected={isSelectedForComparison}
                  onToggle={() => comparison.toggleItem(hotel)}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs line-clamp-2 mb-3 flex-1">{hotel.description}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {hotel.deals.slice(0, 2).map((deal, index) => (
                <span key={index} className={`px-2 py-0.5 rounded text-xs ${deal.highlight ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                  {deal.text}
                </span>
              ))}
            </div>
            <div className="mt-auto border-t border-border pt-3">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  {hotel.discount > 0 && !hotel.staysPricingPending && (
                    <div className="text-sm text-muted-foreground line-through">{formatFromUsd(hotel.originalPrice, locale)}</div>
                  )}
                  {hotel.staysPricingPending ? (
                    <>
                      <div className="text-xl font-bold text-foreground">{hr("cardSeeRoomRates")}</div>
                      <div className="text-xs text-muted-foreground">{hr("cardPriceOnRoomStep")}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-foreground">{formatFromUsd(hotel.price, locale)}</div>
                      <div className="text-xs text-muted-foreground">per night</div>
                    </>
                  )}
                </div>
              </div>
              <Link href={`/hotels/${encodeURIComponent(String(hotel.id))}`}><button className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors duration-300 mb-2">
                {tc("select")}
              </button></Link>
              {!hotel.fromDuffelStays && (
                <div className="text-center text-xs text-success">
                  <Check className="mr-1 inline" />
                  {tc("freeCancellation")}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow duration-300 mb-4">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row">
            {/* Hotel Image */}
            <div className="mb-4 lg:mb-0 lg:w-1/4 lg:pr-6">
              <div className="relative h-48 overflow-hidden rounded-lg bg-muted lg:h-40">
                {hotel.images?.[0] ? (
                  <Image
                    src={hotel.images[0]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    unoptimized={shouldUnoptimizeStaysSupplierImage(hotel.images[0])}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                    <Bed className="text-4xl text-primary/70" />
                  </div>
                )}
                {hotel.discount > 0 && (
                  <div className="absolute top-3 left-3 rounded bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
                    -{hotel.discount}%
                  </div>
                )}
                {hotel.roomsLeft <= 3 && !hotel.fromDuffelStays && (
                  <div className="absolute top-3 right-3 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                    Only {hotel.roomsLeft} left
                  </div>
                )}
              </div>

              {/* Rating Badge */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex items-center rounded-lg bg-primary/20 px-2 py-1 text-primary">
                    <Star className="mr-1" />
                    <span className="font-bold">{hotel.rating}</span>
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {hotel.fromDuffelStays && hotel.reviews === 0 ? "· guest score" : `(${hotel.reviews})`}
                  </span>
                </div>
                <div className="text-muted-foreground text-sm">
                  {renderStars(hotel.stars)}
                </div>
              </div>
            </div>

            {/* Hotel Details */}
            <div className="lg:w-2/4 lg:pr-6">
              <div className="mb-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg hover:text-primary cursor-pointer flex-1"><Link href={`/hotels/${encodeURIComponent(String(hotel.id))}`}>{hotel.name}</Link></h3>
                  <div className="flex items-center gap-2">
                    <WishlistToggle
                      display="icon"
                      type="hotel"
                      refId={String(hotel.id)}
                      title={hotel.name}
                      subtitle={hotel.area || hotel.address}
                      imageUrl={hotel.images?.[0] ?? null}
                    />
                    <ComparisonCheckbox
                      isSelected={isSelectedForComparison}
                      onToggle={() => comparison.toggleItem(hotel)}
                    />
                    <button
                      onClick={() => setExpandedHotel(isExpanded ? null : hotel.id)}
                      className="text-primary hover:text-primary"
                    >
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="mr-1" />
                  <span>{hotel.address}</span>
                </div>

                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <Navigation2 className="mr-1" />
                  <span>{hotel.distanceFromCenter} from center • {hotel.distanceFromAirport} from airport</span>
                </div>
              </div>

              <p className="text-foreground text-sm mb-4 line-clamp-2">{hotel.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {hotel.tags.map((tag, index) => (
                  <span key={index} className="bg-muted text-foreground px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Top Amenities */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Top amenities:</h4>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.slice(0, 4).map((amenityId, index) => {
                    const amenity = amenities.find(a => a.id === amenityId);
                    return amenity ? (
                      <div key={index} className="flex items-center text-muted-foreground text-sm">
                        {amenity.icon}
                        <span className="ml-1">{amenity.name}</span>
                      </div>
                    ) : null;
                  })}
                  {hotel.amenities.length > 4 && (
                    <span className="text-primary text-sm">+{hotel.amenities.length - 4} more</span>
                  )}
                </div>
              </div>

              {/* Deals */}
              <div className="flex flex-wrap gap-2">
                {hotel.deals.map((deal, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded text-xs ${deal.highlight ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}
                  >
                    {deal.text}
                  </span>
                ))}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{hotel.guestRating}</div>
                      <div className="text-xs text-muted-foreground">Guest rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{hotel.locationScore}</div>
                      <div className="text-xs text-muted-foreground">Location</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{hotel.cleanlinessScore}</div>
                      <div className="text-xs text-muted-foreground">Cleanliness</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{hotel.serviceScore}</div>
                      <div className="text-xs text-muted-foreground">Service</div>
                    </div>
                  </div>

                  <div className="text-sm flex items-center justify-center gap-4">
                    <div className="flex items-center text-success mb-1">
                      <Check className="mr-2" />
                      <span>{hotel.mealPlan}</span>
                    </div>
                    {hotel.freeCancellation && (
                      <div className="flex items-center text-success mb-1">
                        <Check className="mr-2" />
                        <span>{tc("freeCancellation")}</span>
                      </div>
                    )}
                    {hotel.payAtHotel && (
                      <div className="flex items-center text-success">
                        <Check className="mr-2" />
                        <span>Pay at hotel available</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price and Select Button */}
            <div className="mt-4 lg:mt-0 lg:w-1/4 lg:border-l lg:pl-6">
              <div className="mb-4 text-right">
                <div className="mb-1 flex flex-col items-start justify-center">
                  {hotel.staysPricingPending ? (
                    <>
                      <div className="text-2xl font-bold text-foreground">{hr("cardSeeRoomRates")}</div>
                      <div className="mb-1 ml-0 text-sm text-muted-foreground">{hr("cardShownAfterPickRoom")}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-foreground">{formatFromUsd(hotel.price, locale)}</div>
                      <div className="mb-1 ml-2 text-sm text-muted-foreground">per night</div>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-start justify-center space-y-2">
                  {!hotel.staysPricingPending && hotel.discount > 0 && (
                    <div className="text-sm text-muted-foreground line-through">{formatFromUsd(hotel.originalPrice, locale)}</div>
                  )}

                  {!hotel.fromDuffelStays && (
                    <>
                      <div className="mb-2 text-sm text-muted-foreground">+ {formatFromUsd(hotel.taxes, locale)} taxes & fees</div>
                      <div className="text-lg font-semibold">{formatFromUsd(hotel.totalPrice, locale)} total</div>
                    </>
                  )}

                  {!hotel.fromDuffelStays && (
                    <div className="mt-1 text-sm text-muted-foreground">{hotel.mealPlan}</div>
                  )}
                </div>

                <Link href={`/hotels/${encodeURIComponent(String(hotel.id))}`}>
                  <button className="mb-2 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-300 hover:bg-primary-600">
                    {tc("select")}
                  </button>
                </Link>

                {!hotel.fromDuffelStays && (
                  <>
                    <div className="mb-1 text-start text-sm text-success">
                      <Check className="mr-1 inline" />
                      {tc("freeCancellation")}
                    </div>
                    <div className="text-start text-xs text-muted-foreground">{hr("cardReserveNowPayLater")}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /** Hotels with a known distance ≤ each radius option (excludes unknown distance). */
  const radiusBucketCounts = useMemo(
    () =>
      Object.fromEntries(
        HOTEL_SEARCH_RADIUS_KM_OPTIONS.map((km) => [
          km,
          hotels.filter((h) => {
            const d = distanceKmForHotelFilter(h, staysSearchOrigin);
            if (d === null) return false;
            return d <= km;
          }).length,
        ]),
      ) as Record<(typeof HOTEL_SEARCH_RADIUS_KM_OPTIONS)[number], number>,
    [hotels, staysSearchOrigin],
  );

  /**
   * Snapshot lives in sessionStorage → always null on SSR. Derive summary only after mount
   * so server and initial client HTML match (avoids hydration mismatch vs filters header).
   */
  const computeHotelEditSummary = useCallback((): { headline: string; lines: string[] } | null => {
    const snap = readStaysSearchFormSnapshot();
    if (!snap?.destination || !snap.check_in_date || !snap.check_out_date) return null;
    const destName =
      snap.destination.kind === "place"
        ? snap.destination.name || snap.destination.iata_code
        : snap.destination.name || snap.destination.code;
    const checkIn = formatFlightSearchShortDate(snap.check_in_date, locale);
    const checkOut = formatFlightSearchShortDate(snap.check_out_date, locale);
    const guests = snap.adults + snap.children;
    return {
      headline: hr("editSearchHeadlineStays", { destination: destName }),
      lines: [
        hr("editSearchStayDatesGuests", {
          checkIn,
          checkOut,
          rooms: snap.rooms,
          guests,
        }),
      ],
    };
  }, [hr, locale]);

  const [hotelEditSummary, setHotelEditSummary] = useState<{ headline: string; lines: string[] } | null>(
    null,
  );

  useEffect(() => {
    const sync = () => setHotelEditSummary(computeHotelEditSummary());
    sync();
    window.addEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, sync);
    window.addEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, sync);
    return () => {
      window.removeEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, sync);
      window.removeEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, sync);
    };
  }, [computeHotelEditSummary]);

  useEffect(() => {
    const onStaysSearchStart = () => {
      setHotelEditSearchOpen(false);
      /** Drawer was opened from inside mobile filters; hide it so results are visible immediately. */
      setShowMobileFilters(false);
    };
    window.addEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, onStaysSearchStart);
    return () => window.removeEventListener(TTU_STAYS_SEARCH_STARTED_EVENT, onStaysSearchStart);
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

  const FilterSidebar = () => (
    <div className="bg-card lg:mb-0 lg:rounded-xl lg:border lg:border-border lg:p-6 lg:shadow-md">
      {hotelEditSummary ? (
        <EditSearchSummaryCard
          headline={hotelEditSummary.headline}
          lines={hotelEditSummary.lines}
          editLabel={hr("editSearchButton")}
          onEdit={() => setHotelEditSearchOpen(true)}
          hotelMobileFullscreenEdit
          onStaysSearchStart={() => {
            setHotelEditSearchOpen(false);
            setShowMobileFilters(false);
          }}
        />
      ) : null}
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">{hr("filtersTitle")}</h2>
        <button
          onClick={clearAllFilters}
          className="text-primary hover:text-primary text-sm font-semibold"
        >
          {tc("clearAll")}
        </button>
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <h3 className="font-bold mb-2">{hr("filterPricePerNightTitle")}</h3>
        <div className="mb-4 flex space-x-4">
          <div className="flex-1">
            <Input
              label={hr("filterMinLabel")}
              type="number"
              value={priceRange[0]}
              onChange={(e) => handlePriceChange("min", e.target.value)}
              min={HOTEL_PRICE_SLIDER_MIN}
              max={HOTEL_PRICE_SLIDER_MAX}
              className="py-2.5"
            />
          </div>
          <div className="flex-1">
            <Input
              label={hr("filterMaxLabel")}
              type="number"
              value={priceRange[1]}
              onChange={(e) => handlePriceChange("max", e.target.value)}
              min={HOTEL_PRICE_SLIDER_MIN}
              max={HOTEL_PRICE_SLIDER_MAX}
              className="py-2.5"
            />
          </div>
        </div>
        <DualSlider
          min={HOTEL_PRICE_SLIDER_MIN}
          max={HOTEL_PRICE_SLIDER_MAX}
          step={1}
          value={priceRange}
          onChange={setPriceRange}
          currencyPrefix=""
          formatRangeLabel={(n) => formatFromUsd(n, locale)}
        />
      </div>

      {/* Star Rating */}
      <div className="mb-4">
        <h3 className="font-bold mb-2">{hr("filterStarRatingTitle")}</h3>
        <div className="">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center justify-between cursor-pointer hover:bg-muted  rounded p-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStars.includes(stars.toString())}
                  onChange={() => handleFilterToggle('stars', stars.toString())}
                  className="w-4 h-4 text-primary rounded focus:ring-ring"
                />
                <div className="flex ml-3">
                  {renderStars(stars)}
                </div>
              </div>
              <span className="text-muted-foreground text-sm">
                {hotels.filter((h) => h.stars === stars).length}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Search radius */}
      <div className="mb-4">
        <h3 className="font-bold mb-2">{hr("filterSearchRadiusTitle")}</h3>
        <Select
          value={String(searchRadiusKm)}
          onValueChange={(v) => setSearchRadiusKm(Number(v))}
        >
          <SelectTrigger
            className="h-10 w-full border-input bg-card"
            aria-label={hr("filterSearchRadiusAria")}
          >
            <SelectValue>
              {hr("radiusSelectionSummary", {
                km: searchRadiusKm,
                count: radiusBucketCounts[searchRadiusKm] ?? 0,
              })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {HOTEL_SEARCH_RADIUS_KM_OPTIONS.map((km) => (
              <SelectItem key={km} value={String(km)}>
                <span className="flex w-full min-w-0 items-center justify-between gap-3 pr-1">
                  <span>{hr("radiusKmOption", { km })}</span>

                  <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
                    {radiusBucketCounts[km] ?? 0}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {hr("mapLocationsTitle")}
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          {hr("mapSidebarHint", { count: filteredHotels.length })}
        </p>
        {loading ? (
          <div
            className="h-[280px] w-full animate-pulse rounded-lg border border-border bg-muted"
            aria-hidden
          />
        ) : (
          <LeafletMap locations={filteredHotels} height="280px" zoom={12} />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="border-b border-border/60 bg-muted shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {loading ? "Hotel search results" : hotels.length > 0 ? "Hotel search results" : "Hotels"}
              </h1>
              <p className="text-muted-foreground">
                {loading
                  ? hr("loadingResults")
                  : hotels.length > 0
                    ? "Open a property for room rates and quotes. List prices are indicative until you pick a rate."
                    : "Use the search form above to find stays."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Sort Options — custom dropdown on small screens, buttons from lg+ */}
        <div className="mb-2 flex flex-col gap-3 sm:gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4">
          <div className="w-full min-w-0 lg:w-auto">
            <div
              className="relative z-10 w-full min-w-0 overflow-visible lg:hidden"
              ref={sortMenuRef}
            >
              <button
                type="button"
                id="hotel-sort-trigger"
                onClick={() => setSortMenuOpen((o) => !o)}
                aria-expanded={sortMenuOpen}
                aria-haspopup="listbox"
                aria-label={
                  mobileSortChosen
                    ? (HOTEL_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? hr("sortByFallback"))
                    : hr("sortOpenMenuAria")
                }
                className="flex h-12 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-card px-4 py-2 text-left text-base font-medium text-foreground shadow-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-11 sm:text-sm"
              >
                <span className="min-w-0 truncate text-left font-medium text-foreground">
                  {mobileSortChosen
                    ? HOTEL_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? hr("sortByFallback")
                    : hr("sortByFallback")}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:h-4 sm:w-4 ${sortMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {sortMenuOpen && (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(20rem,55vh)] w-full min-w-0 overflow-hidden overflow-y-auto rounded-lg border border-input bg-card shadow-lg"
                  role="listbox"
                  aria-labelledby="hotel-sort-trigger"
                >

                  <div className="py-1">
                    {HOTEL_SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={sortBy === opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setMobileSortChosen(true);
                          setSortMenuOpen(false);
                        }}
                        className={`flex w-full min-w-0 px-4 py-3 text-left text-sm transition-colors sm:py-2.5 ${sortBy === opt.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground hover:bg-muted active:bg-muted"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden flex-wrap items-center gap-2 lg:flex lg:mb-0">
              <span className="mr-2 text-foreground">{hr("sortLabel")}</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[min(100%,280px)] shrink-0 border-input bg-card sm:w-[220px]">
                  <SelectValue placeholder={hr("sortPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {HOTEL_SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4 lg:w-auto lg:flex-nowrap lg:justify-end py-2 ">
            <div className="text-muted-foreground text-sm sm:text-base">
              {loading ? (
                <span>{hr("loadingResults")}</span>
              ) : hotels.length === 0 ? (
                <span>—</span>
              ) : filteredHotels.length === 0 ? (
                <span>{hr("noMatching")}</span>
              ) : (
                <span>
                  {hr("showingRange", {
                    start: (displayPage - 1) * HOTEL_RESULTS_PAGE_SIZE + 1,
                    end: Math.min(displayPage * HOTEL_RESULTS_PAGE_SIZE, filteredHotels.length),
                    total: filteredHotels.length,
                  })}{" "}
                  {filteredHotels.length === 1 ? hr("propertySingular") : hr("propertyPlural")}
                  {filteredHotels.length !== hotels.length
                    ? hr("totalInParens", { total: hotels.length })
                    : ""}
                </span>
              )}
            </div>
            <div className="">
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                disabled={loading || filteredHotels.length === 0}
                className="flex items-center font-medium text-primary hover:text-primary-700 disabled:pointer-events-none disabled:opacity-50"
              >
                <TrendingUp className="mr-2 shrink-0" aria-hidden />
                Show on map
              </button>
            </div>
            <div className="hidden sm:flex overflow-hidden rounded-lg border border-input">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}
                title="List view"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Desktop */}
          <div className="lg:w-1/4 hidden lg:block">
            <FilterSidebar />
          </div>

          {/* Mobile Filters Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold flex items-center justify-center"
            >
              <Filter className="mr-2" aria-hidden />
              {hr("showFiltersButton")}
            </button>
          </div>

          {/* Mobile Filters Modal */}
          {showMobileFilters ? (
            <div
              className="fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col bg-card lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={hr("filtersTitle")}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                <h2 className="text-xl font-bold text-foreground">{hr("filtersTitle")}</h2>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-lg p-1 text-foreground hover:bg-muted"
                  aria-label={tc("close")}
                >
                  <X className="h-6 w-6" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 dropdown-scrollbar">
                <FilterSidebar />
              </div>
              <div className="shrink-0 border-t border-border bg-card p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground"
                >
                  {tc("applyFilters")}
                </button>
              </div>
            </div>
          ) : null}

          {/* Hotel Listings */}
          <div
            ref={resultsAnchorRef}
            id="hotel-results"
            className="lg:w-3/4 scroll-mt-24"
          >
            {loading ? (
              <HotelSearchResultSkeleton
                rows={showGrid ? 6 : 5}
                variant={showGrid ? "grid" : "list"}
              />
            ) : hotels.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center shadow-md">
                <X className="mx-auto mb-4 text-4xl text-muted-foreground" />
                <h3 className="mb-2 text-xl font-bold">No search results</h3>
                <p className="mb-4 text-muted-foreground">
                  Run a new search from the form above, or open the hotels browse page.
                </p>
                <Link
                  href="/hotels"
                  className="inline-flex rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground"
                >
                  Back to browse
                </Link>
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center shadow-md">
                <X className="mx-auto mb-4 text-4xl text-destructive" />
                <h3 className="mb-2 text-xl font-bold">No hotels match your filters</h3>
                <p className="mb-4 text-muted-foreground">Try adjusting your filters to see more results</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Map View Button */}


                {/* Hotel Cards */}
                {showGrid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedHotels.map(hotel => (
                      <HotelCard key={hotel.id} hotel={hotel} variant="grid" />
                    ))}
                  </div>
                ) : (
                  paginatedHotels.map(hotel => (
                    <HotelCard key={hotel.id} hotel={hotel} variant="list" />
                  ))
                )}

                {totalPages > 1 ? (
                  <nav
                    className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
                    aria-label="Hotel results pagination"
                  >
                    <p className="text-center text-sm text-muted-foreground sm:text-left">
                      Page {displayPage} of {totalPages}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={displayPage <= 1}
                        className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
                        aria-label="Previous page"
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
                            className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm ${displayPage === item
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
                        aria-label="Next page"
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

        {/* Generic Comparison Component */}
        <GenericComparison
          items={hotels}
          selectedItems={comparison.selectedItems}
          config={hotelComparisonConfig}
          isModalOpen={comparison.showModal}
          onToggleItem={comparison.toggleItem}
          onClearAll={comparison.clearAll}
          onOpenModal={comparison.openModal}
          onCloseModal={comparison.closeModal}
        />

        <Dialog  open={hotelEditSearchOpen} onOpenChange={setHotelEditSearchOpen}>
          <DialogContent
            className={cn(
              "flex max-h-[min(92vh,880px)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0  rounded-2xl bg-background p-0 shadow-2xl sm:max-w-2xl lg:max-w-4xl",
            )}
          >
            <DialogHeader className="shrink-0 space-y-1 border-b border-border bg-muted/30 px-4 py-4 text-left sm:px-6">
              <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">{hr("editSearchModalTitle")}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(92vh-8rem)]  p-3">
              <HotelsTab
                key={hotelEditSearchOpen ? "hotel-edit-search-open" : "hotel-edit-search-closed"}
                layout="browse"
                mode={true}
                onStaysSearchStart={() => {
                  setHotelEditSearchOpen(false);
                  setShowMobileFilters(false);
                }}
              />
            </div>
     
          </DialogContent>
        </Dialog>

        <HotelMapModal
          open={showMapModal}
          onClose={() => setShowMapModal(false)}
          locations={filteredHotels}
        />
      </div>
    </div>
  );
};

export default HotelBook;