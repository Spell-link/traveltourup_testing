"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Plane, Building2, Car, Users, Calendar, Luggage, ChevronDown, ChevronUp } from "lucide-react";
import {
  BookingSidebarSummaryRow,
  BookingSidebarSummarySection,
  formatSidebarDate,
} from "@/components/shared/booking-sidebar-summary";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin_ui/ui/sheet";
import type { HotelRoom } from "@/data/mock-hotels";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import { getFlightSeatMapsDeduped } from "@/lib/http/flights.client";
import { FlightCheckoutDuffelExtras } from "@/components/flights/FlightCheckoutDuffelExtras";
import { estimateAncillariesAddOn } from "@/lib/flights/estimate-ancillaries";
import {
  flightAncillariesStorageKey,
  type StoredFlightAncillaries,
} from "@/lib/flights/flight-detail-session";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import {
  defaultFlowContext,
  isChangeFlightFlow,
  type FlightFlowContext,
} from "@/lib/flights/flight-flow-context";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";
import {
  parseChangeDelta,
  patchFlightChangeSession,
} from "@/lib/flights/flight-change-session";
import {
  resolveCarBookingSidebarMeta,
  resolveFlightBookingSidebarMeta,
  resolveHotelBookingSidebarMeta,
} from "@/lib/bookings/booking-sidebar-context";
import { writeFlightOfferSnapshot } from "@/lib/flights/flight-offer-snapshot";
import { scrollToHotelAvailableRooms } from "@/lib/hotels/scroll-to-available-rooms";
import { refreshStaysQuoteForCheckout } from "@/lib/http/stays.client";
import { buildStaysQuoteSessionContext } from "@/lib/stays/stays-quote-context";
import { writeStaysQuoteSession } from "@/lib/stays/stays-quote-session";
import { trackClientJourneyEvent } from "@/lib/http/journey.client";

const BOOKING_STORAGE_KEY = "booking-details";

/** Stable ids for mock flight extras (labels come from messages). */
const EXTRA_BAGGAGE_ID = "extra_baggage";
const EXTRA_SEAT_SELECTION_ID = "seat_selection";

export type BookingItemType = "flight" | "hotel" | "car";

export interface BookingItemBase {
  id: string | number;
  price: number;
  currency?: string;
}

export interface FlightBookingItem extends BookingItemBase {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export interface HotelBookingItem extends BookingItemBase {
  name?: string;
  address?: string;
  roomName?: string;
  roomPricePerNight?: number;
}

export interface CarBookingItem extends BookingItemBase {
  name?: string;
  type?: string;
  supplier?: string;
}

export type BookingItem = FlightBookingItem | HotelBookingItem | CarBookingItem;

export interface StaysQuoteSidebar {
  quoteId: string;
  rateId: string;
  totalAmount: string;
  currency: string;
  checkIn: string;
  checkOut: string;
  expiresAt?: string | null;
}

export interface BookingSidebarProps {
  item: BookingItem;
  type: BookingItemType;
  /** For hotel: selected rooms (can be multiple types and quantities) */
  selectedRooms?: HotelRoom[];
  /** For hotel: list of available rooms (used to show "Select a room" prompt) */
  availableRooms?: HotelRoom[];
  /** Duffel Stays: when set, checkout uses quote total and `/hotels/payment?quote_id=` */
  staysQuote?: StaysQuoteSidebar | null;
  /** Duffel Stays: disable payment CTA while quote request is in flight. */
  staysQuoteLoading?: boolean;
  /**
   * Duffel Stays detail: after a room is selected, CTA stays disabled until `staysQuote` is set.
   * Mock hotels omit this so checkout can proceed once at least one room is selected.
   */
  requiresStaysQuote?: boolean;
  /** When set on flight detail, sidebar shows real Duffel bags/seats before payment. */
  flightOffer?: FlightOfferDTO | null;
  /** Change-flight flow context (optional). */
  flowContext?: FlightFlowContext;
  changeOffer?: FlightOrderChangeOffer | null;
  beforeChangeAmount?: string;
  beforeChangeCurrency?: string;
  quoteExpiresAt?: string | null;
  /** Override travelers when parent already has search context. */
  travelers?: { adults: number; children: number; infants?: number };
  /** Override stay / travel dates (`YYYY-MM-DD`). */
  stayDates?: { from: string; to: string };
  /** Override room count for hotel sidebar. */
  guestRooms?: number;
  /** Pre-built payment URL for order change confirm. */
  changePaymentHref?: string;
}

function getFlightPaymentPath(item: BookingItem, searchSessionId?: string | null): string {
  const q = new URLSearchParams({ offer_id: String(item.id) });
  if (searchSessionId?.trim()) q.set("search_session", searchSessionId.trim());
  return `/flights/payment?${q.toString()}`;
}

function getPaymentPath(type: BookingItemType): string {
  switch (type) {
    case "flight":
      return "/flights/payment";
    case "hotel":
      return "/hotels/payment";
    case "car":
      return "/cars/payment";
  }
}

function getItemTitle(item: BookingItem, type: BookingItemType): string {
  switch (type) {
    case "flight": {
      const f = item as FlightBookingItem;
      return `${f.airline ?? "Flight"} ${f.flightNumber ?? ""} ${f.departureAirport ?? ""} → ${f.arrivalAirport ?? ""}`.trim();
    }
    case "hotel": {
      const h = item as HotelBookingItem;
      return h.name ?? "Hotel";
    }
    case "car": {
      const c = item as CarBookingItem;
      return `${c.name ?? "Car"} (${c.type ?? ""})`.trim();
    }
    default:
      return "Booking";
  }
}

/**
 * Generic booking sidebar for detail pages.
 * Shows dates, travelers, extras, price summary, and "Proceed to Payment" CTA.
 */
export function BookingSidebar({
  item,
  type,
  selectedRooms = [],
  availableRooms,
  staysQuote = null,
  staysQuoteLoading = false,
  requiresStaysQuote = false,
  flightOffer = null,
  flowContext: flowContextProp,
  changeOffer = null,
  beforeChangeAmount,
  beforeChangeCurrency,
  quoteExpiresAt = null,
  changePaymentHref,
  travelers: travelersProp,
  stayDates: stayDatesProp,
  guestRooms: guestRoomsProp,
}: BookingSidebarProps) {
  const flowContext = defaultFlowContext(flowContextProp);
  const isChangeFlow = isChangeFlightFlow(flowContext);
  const changeBookingId = isChangeFlow ? flowContext.bookingId : "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const flightSearchSessionId = searchParams.get("search_session");
  const tb = useTranslations("Booking.sidebar");
  const tCheckout = useTranslations("Hotels.checkout");
  const tChange = useTranslations("Flights.change");
  const tFlightTab = useTranslations("Flights.tab");
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const isRtl = locale === "ar" || locale === "ur";

  const isHotel = type === "hotel";
  const isFlight = type === "flight";

  const flightSidebarMeta = useMemo(
    () => (isFlight ? resolveFlightBookingSidebarMeta(flightOffer) : null),
    [isFlight, flightOffer],
  );
  const hotelSidebarMeta = useMemo(
    () => (isHotel ? resolveHotelBookingSidebarMeta(staysQuote) : null),
    [isHotel, staysQuote],
  );
  const carSidebarDates = useMemo(
    () => (type === "car" ? resolveCarBookingSidebarMeta() : null),
    [type],
  );

  const adults =
    travelersProp?.adults ??
    flightSidebarMeta?.travelers.adults ??
    hotelSidebarMeta?.travelers.adults ??
    1;
  const children =
    travelersProp?.children ??
    flightSidebarMeta?.travelers.children ??
    hotelSidebarMeta?.travelers.children ??
    0;
  const infants =
    travelersProp?.infants ??
    flightSidebarMeta?.travelers.infants ??
    hotelSidebarMeta?.travelers.infants ??
    0;
  const checkIn =
    stayDatesProp?.from ??
    flightSidebarMeta?.dates.checkIn ??
    hotelSidebarMeta?.dates.checkIn ??
    carSidebarDates?.checkIn ??
    "";
  const checkOut =
    stayDatesProp?.to ??
    flightSidebarMeta?.dates.checkOut ??
    hotelSidebarMeta?.dates.checkOut ??
    carSidebarDates?.checkOut ??
    "";

  const [rooms, setRooms] = useState(guestRoomsProp ?? hotelSidebarMeta?.rooms ?? 1);
  useEffect(() => {
    const next = guestRoomsProp ?? hotelSidebarMeta?.rooms;
    if (next != null) setRooms(next);
  }, [guestRoomsProp, hotelSidebarMeta?.rooms]);

  const [extras, setExtras] = useState<string[]>([]);

  const [duffelBagQuantities, setDuffelBagQuantities] = useState<Record<string, number>>({});
  const [duffelSeatSelections, setDuffelSeatSelections] = useState<Record<string, string>>({});
  const [duffelSeatPassengerId, setDuffelSeatPassengerId] = useState("");
  const [seatMaps, setSeatMaps] = useState<SeatMapDTO[] | null>(null);
  const [seatMapsLoading, setSeatMapsLoading] = useState(false);
  const [seatMapsError, setSeatMapsError] = useState<string | null>(null);
  const [bagsSeatsOpen, setBagsSeatsOpen] = useState(false);
  const bagsSeatsPanelId = useId();
  const bagsSeatsTriggerId = `${bagsSeatsPanelId}-trigger`;

  const [mobileBookingSheetOpen, setMobileBookingSheetOpen] = useState(false);
  const [lgUp, setLgUp] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setLgUp(mq.matches);
    const onChange = () => setLgUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (lgUp) setMobileBookingSheetOpen(false);
  }, [lgUp]);

  useEffect(() => {
    if (!flightOffer) return;
    setDuffelBagQuantities((prev) => {
      const next = { ...prev };
      for (const s of flightOffer.available_services) {
        if (next[s.id] === undefined) next[s.id] = 0;
      }
      return next;
    });
  }, [flightOffer]);

  useEffect(() => {
    if (!flightOffer) return;
    setDuffelSeatPassengerId((prev) => {
      if (prev && flightOffer.passengers.some((p) => p.id === prev)) return prev;
      return flightOffer.passengers[0]?.id ?? "";
    });
  }, [flightOffer]);

  useEffect(() => {
    if (!flightOffer) return;
    try {
      const raw = sessionStorage.getItem(flightAncillariesStorageKey(flightOffer.id));
      if (!raw) return;
      const p = JSON.parse(raw) as StoredFlightAncillaries;
      if (p.bagQuantities && typeof p.bagQuantities === "object") setDuffelBagQuantities(p.bagQuantities);
      if (p.seatSelections && typeof p.seatSelections === "object") setDuffelSeatSelections(p.seatSelections);
      if (p.seatPassengerId && flightOffer.passengers.some((x) => x.id === p.seatPassengerId)) {
        setDuffelSeatPassengerId(p.seatPassengerId);
      }
    } catch {
      /* ignore */
    }
  }, [flightOffer?.id]);

  useEffect(() => {
    if (!isChangeFlow || !changeBookingId) return;
    try {
      const raw = sessionStorage.getItem(`ttu_flight_change_${changeBookingId}`);
      if (!raw) return;
      const session = JSON.parse(raw) as { ancillaries?: StoredFlightAncillaries };
      const p = session.ancillaries;
      if (!p) return;
      if (p.bagQuantities && typeof p.bagQuantities === "object") setDuffelBagQuantities(p.bagQuantities);
      if (p.seatSelections && typeof p.seatSelections === "object") setDuffelSeatSelections(p.seatSelections);
      if (p.seatPassengerId) setDuffelSeatPassengerId(p.seatPassengerId);
    } catch {
      /* ignore */
    }
  }, [isChangeFlow, changeBookingId]);

  useEffect(() => {
    if (!flightOffer) return;
    const skipSeatMaps =
      isChangeFlow ||
      flightOffer.id.startsWith("oco_") ||
      flightOffer.available_services.length === 0;
    if (skipSeatMaps) {
      setSeatMaps([]);
      setSeatMapsError(isChangeFlow ? tChange("ancillariesUnavailable") : null);
      setSeatMapsLoading(false);
      return;
    }
    let cancelled = false;
    setSeatMapsError(null);
    setSeatMapsLoading(true);
    getFlightSeatMapsDeduped(flightOffer.id)
      .then((r) => {
        if (!cancelled) setSeatMaps(r.seat_maps);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setSeatMapsError(
            isChangeFlow ? tChange("ancillariesUnavailable") : e?.message ?? "Could not load seat maps",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSeatMapsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flightOffer?.id, isChangeFlow, tChange]);

  const duffelEstimates = useMemo(() => {
    if (!flightOffer) return null;
    const base = parseFloat(flightOffer.total_amount);
    const { addOn, currency } = estimateAncillariesAddOn(
      flightOffer,
      duffelBagQuantities,
      duffelSeatSelections,
      seatMaps,
    );
    return {
      base: Number.isFinite(base) ? base : 0,
      addOn,
      currency,
      total: (Number.isFinite(base) ? base : 0) + addOn,
    };
  }, [flightOffer, duffelBagQuantities, duffelSeatSelections, seatMaps]);

  const handleDuffelSelectSeat = (segmentKey: string, passengerId: string, serviceId: string | null) => {
    const key = `${segmentKey}::${passengerId}`;
    setDuffelSeatSelections((prev) => {
      const next = { ...prev };
      if (!serviceId) delete next[key];
      else next[key] = serviceId;
      return next;
    });
  };

  const basePrice = item.price ?? 0;
  const currency = item.currency ?? "USD";
  const changeDelta = changeOffer ? parseChangeDelta(changeOffer) : null;
  const changeCurrency =
    changeOffer?.change_total_currency ?? beforeChangeCurrency ?? currency;
  /** Sticky total bar + bottom sheet on small viewports (hotel + flight detail pages). */
  const useMobileBottomSheet = isHotel || isFlight;
  const hasHotelRooms = isHotel && availableRooms && availableRooms.length > 0;

  // For hotel with selected room: compute total from pricePerNight × nights
  const nights = (() => {
    if (!checkIn || !checkOut) return 7;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  })();

  const [hotelProceedBusy, setHotelProceedBusy] = useState(false);

  const totalRooms = selectedRooms?.length ?? 0;
  const hotelMustPickRoom = isHotel && hasHotelRooms && totalRooms === 0;
  const hotelAwaitingStaysQuote =
    isHotel &&
    hasHotelRooms &&
    totalRooms > 0 &&
    requiresStaysQuote &&
    (staysQuote === null || staysQuoteLoading) &&
    !hotelProceedBusy;
  const priceFromQuote =
    staysQuote && staysQuote.totalAmount ? Number.parseFloat(staysQuote.totalAmount) : null;

  const hotelRoomStayTotal = (r: HotelRoom) => {
    if (r.totalStayAmount) {
      const n = Number.parseFloat(r.totalStayAmount);
      if (Number.isFinite(n)) return n;
    }
    return r.pricePerNight * nights;
  };

  const price =
    priceFromQuote != null && Number.isFinite(priceFromQuote)
      ? priceFromQuote
      : isHotel && totalRooms > 0
        ? selectedRooms!.reduce((sum, r) => sum + hotelRoomStayTotal(r), 0)
        : basePrice;
  const priceStrDisplay =
    staysQuote && staysQuote.totalAmount
      ? formatPrice(Number.parseFloat(staysQuote.totalAmount), staysQuote.currency, locale)
      : isHotel
        ? formatPrice(Number.isFinite(price) ? price : 0, currency, locale)
        : formatPrice(price, currency, locale);

  const summaryPriceStored =
    staysQuote && staysQuote.totalAmount
      ? `${staysQuote.currency} ${Number.parseFloat(staysQuote.totalAmount)}`
      : isHotel
        ? `${currency} ${Number.isFinite(price) ? price.toFixed(2) : "0.00"}`
        : type === "flight" && flightOffer && duffelEstimates
          ? `${flightOffer.total_currency} ${duffelEstimates.total.toFixed(2)}`
          : `${currency} ${Number(price).toFixed(2)}`;

  const travelerPartySummary = useMemo(() => {
    const base = tb("partySummary", { adults, children });
    if (infants > 0) {
      return `${base}, ${infants} ${tFlightTab("infantsLabel").toLowerCase()}`;
    }
    return base;
  }, [adults, children, infants, tb, tFlightTab]);

  const handleProceedToPayment = () => {
    if (hotelMustPickRoom) {
      setMobileBookingSheetOpen(false);
      scrollToHotelAvailableRooms();
      return;
    }

    const title = getItemTitle(item, type);
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

    const productRef = String(item.id);
    const journeyPrice = Number.isFinite(item.price) ? item.price.toFixed(2) : undefined;

    const tripSnapshot: Partial<import("@/lib/journey/journey-trip-snapshot").JourneyTripSnapshot> = {
      product_type: type,
      product_ref: productRef,
      start_date: checkIn || undefined,
      end_date: checkOut || undefined,
      adults,
      children,
      infants,
      price_amount: journeyPrice,
      price_currency: item.currency ?? undefined,
    };

    if (type === "flight") {
      const f = item as FlightBookingItem;
      tripSnapshot.origin_label = f.departureAirport ?? undefined;
      tripSnapshot.destination_label = f.arrivalAirport ?? undefined;
      tripSnapshot.origin_code = f.departureAirport ?? undefined;
      tripSnapshot.destination_code = f.arrivalAirport ?? undefined;
      tripSnapshot.airline = f.airline ?? undefined;
      if (checkIn && checkOut && checkIn !== checkOut) {
        tripSnapshot.trip_type = "round_trip";
      } else {
        tripSnapshot.trip_type = "one_way";
      }
    } else if (type === "hotel") {
      const h = item as HotelBookingItem;
      tripSnapshot.hotel_name = h.name ?? undefined;
      tripSnapshot.location_label = h.address ?? undefined;
      tripSnapshot.rooms = totalRooms > 0 ? totalRooms : rooms;
      if (selectedRooms?.[0]?.name) tripSnapshot.room_name = selectedRooms[0].name;
    }

    trackClientJourneyEvent({
      event_type: "checkout.clicked",
      product_type: type,
      product_ref: productRef,
      stage: "checkout_clicked",
      title,
      price_amount: journeyPrice,
      price_currency: item.currency ?? undefined,
      trip_snapshot: tripSnapshot,
    });

    const options: { label: string; value: string }[] = [];

    if (type === "flight") {
      options.push({
        label: tb("summaryTravelers"),
        value: travelerPartySummary,
      });
      options.push({ label: tb("summaryDates"), value: `${checkIn} - ${checkOut}` });
      if (flightOffer) {
        const bagQty = Object.values(duffelBagQuantities).reduce((a, b) => a + b, 0);
        const seatN = Object.values(duffelSeatSelections).filter(Boolean).length;
        if (bagQty > 0 || seatN > 0) {
          options.push({
            label: tb("summaryExtras"),
            value: [
              bagQty > 0 ? tb("extrasBagServices", { qty: bagQty }) : null,
              seatN > 0 ? tb("extrasSeatsChosen", { count: seatN }) : null,
            ]
              .filter(Boolean)
              .join(" · "),
          });
        }
      } else if (extras.length > 0) {
        const extraLabels = extras.map((id) =>
          id === EXTRA_BAGGAGE_ID
            ? tb("extraBaggage50")
            : id === EXTRA_SEAT_SELECTION_ID
              ? tb("seatSelection25")
              : id,
        );
        options.push({ label: tb("summaryExtras"), value: extraLabels.join(", ") });
      }
    } else if (type === "hotel") {
      options.push({
        label: tb("summaryGuests"),
        value: travelerPartySummary,
      });
      options.push({ label: tb("summaryRooms"), value: String(totalRooms > 0 ? totalRooms : rooms) });
      options.push({ label: tb("summaryStay"), value: `${checkIn} - ${checkOut}` });
      if (selectedRooms && selectedRooms.length > 0) {
        const byId = selectedRooms.reduce((acc, r) => {
          if (!acc[r.id]) acc[r.id] = { name: r.name, count: 0 };
          acc[r.id].count++;
          return acc;
        }, {} as Record<string, { name: string; count: number }>);
        Object.values(byId).forEach(({ name, count }) => {
          options.push({ label: tb("summaryRoom"), value: count > 1 ? `${name} (×${count})` : name });
        });
      }
    } else {
      options.push({ label: tb("summaryRentalPeriod"), value: `${checkIn} - ${checkOut}` });
    }

    if (extras.length > 0 && type !== "flight") {
      const extraLabels = extras.map((id) =>
        id === EXTRA_BAGGAGE_ID
          ? tb("extraBaggage50")
          : id === EXTRA_SEAT_SELECTION_ID
            ? tb("seatSelection25")
            : id,
      );
      options.push({ label: tb("summaryExtras"), value: extraLabels.join(", ") });
    }

    const bookingDetails = {
      type: typeLabel,
      title,
      price: summaryPriceStored,
      options,
    };

    const navigateHotelCheckout = async () => {
      const rateId = selectedRooms?.[0]?.id;
      if (!rateId) {
        scrollToHotelAvailableRooms();
        return;
      }
      setHotelProceedBusy(true);
      try {
        const fresh = await refreshStaysQuoteForCheckout(rateId);
        const session = writeStaysQuoteSession({
          quote: fresh,
          checkIn,
          checkOut,
          searchResultId: typeof item.id === "string" ? item.id : undefined,
          context: buildStaysQuoteSessionContext({
            hotelName: title,
            hotelAddress: "address" in item && typeof item.address === "string" ? item.address : undefined,
            room: selectedRooms?.[0] ?? null,
          }),
        });
        sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookingDetails));
        const searchResultId = typeof item.id === "string" ? item.id : undefined;
        const payQs = new URLSearchParams({ quote_id: session.quote_id });
        if (searchResultId) payQs.set("search_result_id", searchResultId);
        router.push(`/hotels/payment?${payQs.toString()}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not lock price";
        window.alert(
          /expired|unavailable|no longer available/i.test(msg)
            ? `${msg}\n\nPlease select the room again or run a new hotel search.`
            : msg,
        );
      } finally {
        setHotelProceedBusy(false);
      }
    };

    try {
      if (type === "hotel" && requiresStaysQuote) {
        void navigateHotelCheckout();
        return;
      }
      if (type === "flight" && flightOffer) {
        const payload: StoredFlightAncillaries = {
          bagQuantities: duffelBagQuantities,
          seatSelections: duffelSeatSelections,
          seatPassengerId: duffelSeatPassengerId,
        };
        sessionStorage.setItem(flightAncillariesStorageKey(flightOffer.id), JSON.stringify(payload));
        if (!isChangeFlow) {
          writeFlightOfferSnapshot(flightOffer);
        }
        if (isChangeFlow && changeBookingId) {
          patchFlightChangeSession(changeBookingId, { ancillaries: payload });
        }
      }
      sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookingDetails));
      if (isChangeFlow && changePaymentHref) {
        router.push(changePaymentHref);
        return;
      }
      const path =
        type === "flight"
          ? getFlightPaymentPath(item, flightSearchSessionId)
          : getPaymentPath(type);
      router.push(path);
    } catch {
      console.error("Failed to store booking details");
    }
  };

  const Icon = type === "flight" ? Plane : type === "hotel" ? Building2 : Car;
  const cardTitle = getItemTitle(item, type);
  const bookingTypeLine = (() => {
    const cat =
      type === "hotel"
        ? tCheckout("summaryTypeHotel")
        : type === "car"
          ? tCheckout("summaryTypeCar")
          : tCheckout("summaryTypeFlight");
    return `${cat} ${tCheckout("summaryBookingWord")}`.toUpperCase();
  })();
  const cardSubtitle =
    type === "hotel" && "address" in item && typeof item.address === "string"
      ? item.address
      : type === "car" && "supplier" in item && typeof item.supplier === "string"
        ? item.supplier
        : null;
  const datesSectionTitle =
    type === "hotel" ? tb("datesHotel") : type === "car" ? tb("datesCar") : tb("datesFlight");
  const stayRangeDisplay =
    checkIn && checkOut
      ? `${formatSidebarDate(checkIn, locale)} – ${formatSidebarDate(checkOut, locale)}`
      : "—";

  const renderBookingCard = () => (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="overflow-auto rounded-2xl border border-border bg-card shadow-sm dropdown-scrollbar max-h-[calc(100vh-6rem)]"
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-6 py-4">
        <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        <h3 className="text-lg font-bold text-foreground">{tb("title")}</h3>
      </div>

      <div className="space-y-2 p-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {bookingTypeLine}
          </p>
          <h4 className="text-xl font-bold leading-snug text-foreground">{cardTitle}</h4>
          {cardSubtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{cardSubtitle}</p>
          ) : null}
        </div>

        {hasHotelRooms && totalRooms === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            {tb("hotelPromptSelectRooms")}
          </p>
        ) : null}

        {hasHotelRooms && totalRooms > 0 ? (
          <div className="rounded-lg border border-border bg-muted/25 px-3 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tb("selectedRoomsHeading")}
            </p>
            <div className="max-h-24 space-y-2 overflow-y-auto overscroll-contain pr-1 dropdown-scrollbar">
              {(() => {
                const byRoom = selectedRooms!.reduce((acc, r) => {
                  if (!acc[r.id]) acc[r.id] = { room: r, count: 0 };
                  acc[r.id].count++;
                  return acc;
                }, {} as Record<string, { room: (typeof selectedRooms)[0]; count: number }>);
                const nightsWord = nights === 1 ? tb("nightSingular") : tb("nightPlural");
                return Object.values(byRoom).map(({ room, count }) => (
                  <div key={room.id}>
                    <p className="font-semibold text-foreground">
                      {room.name}
                      {count > 1 ? ` (×${count})` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {room.totalStayAmount && room.totalStayCurrency
                        ? `${formatPrice(Number.parseFloat(room.totalStayAmount), room.totalStayCurrency, locale)} ${tb("totalStayPhrase")}${count > 1 ? ` × ${count}` : ""}`
                        : `${formatPrice(room.pricePerNight, currency, locale)} × ${nights} ${nightsWord}${count > 1 ? ` × ${count}` : ""} = ${formatPrice(room.pricePerNight * nights * count, currency, locale)}`}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <BookingSidebarSummarySection icon={<Calendar strokeWidth={2} />} title={datesSectionTitle}>
            <BookingSidebarSummaryRow
              label={type === "hotel" ? tb("summaryStay") : tb("summaryDates")}
              value={stayRangeDisplay}
            />
            {type === "hotel" && checkIn && checkOut ? (
              <BookingSidebarSummaryRow
                label={tb("summaryNights")}
                value={`${nights} ${nights === 1 ? tb("nightSingular") : tb("nightPlural")}`}
              />
            ) : null}
          </BookingSidebarSummarySection>

          {(type === "flight" || type === "hotel") && (
            <BookingSidebarSummarySection
              icon={<Users className="h-4 w-4" />}
              title={type === "hotel" ? tb("guests") : tb("travelers")}
            >
              <BookingSidebarSummaryRow
                label={type === "hotel" ? tb("summaryGuests") : tb("summaryTravelers")}
                value={travelerPartySummary}
              />
              {type === "hotel" ? (
                <BookingSidebarSummaryRow
                  label={tb("summaryRooms")}
                  value={String(totalRooms > 0 ? totalRooms : rooms)}
                />
              ) : null}
              {type === "hotel" && selectedRooms && selectedRooms.length > 0
                ? (() => {
                    const byId = selectedRooms.reduce((acc, r) => {
                      if (!acc[r.id]) acc[r.id] = { name: r.name, count: 0 };
                      acc[r.id].count++;
                      return acc;
                    }, {} as Record<string, { name: string; count: number }>);
                    return Object.values(byId).map(({ name, count }) => (
                      <BookingSidebarSummaryRow
                        key={name}
                        label={tb("summaryRoom")}
                        value={count > 1 ? `${name} (×${count})` : name}
                      />
                    ));
                  })()
                : null}
            </BookingSidebarSummarySection>
          )}

          {type === "hotel" && !hasHotelRooms ? (
            <BookingSidebarSummarySection icon={<Building2 className="h-4 w-4" />} title={tb("rooms")}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{tb("rooms")}</span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    className="px-2.5 py-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    disabled={rooms <= 1}
                    onClick={() => setRooms((r) => Math.max(1, r - 1))}
                    aria-label={tb("roomsDecreaseAria", { defaultValue: "Fewer rooms" })}
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center font-semibold tabular-nums text-foreground">
                    {rooms}
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    disabled={rooms >= 9}
                    onClick={() => setRooms((r) => Math.min(9, r + 1))}
                    aria-label={tb("roomsIncreaseAria", { defaultValue: "More rooms" })}
                  >
                    +
                  </button>
                </div>
              </div>
            </BookingSidebarSummarySection>
          ) : null}
        </div>

        {/* Flight: Duffel bags & seats (detail page) or legacy placeholder extras */}
        {type === "flight" && flightOffer ? (
          <div className="rounded-t-xl border border-border bg-muted/20">
            <button
              type="button"
              id={bagsSeatsTriggerId}
              aria-expanded={bagsSeatsOpen}
              aria-controls={bagsSeatsPanelId}
              onClick={() => setBagsSeatsOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-t-xl px-3 py-3 text-start text-sm font-medium text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Luggage className="h-4 w-4 shrink-0 text-foreground dark:text-white" strokeWidth={2} aria-hidden />
                {tb("bagsAndSeats")}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${bagsSeatsOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {bagsSeatsOpen ? (
              <div
                id={bagsSeatsPanelId}
                role="region"
                aria-labelledby={bagsSeatsTriggerId}
                className="max-h-[min(75vh,36rem)] overflow-y-auto overscroll-contain border-t border-border px-2 pb-3 pt-1 dropdown-scrollbar"
              >
                <FlightCheckoutDuffelExtras
                  offer={flightOffer}
                  seatMaps={seatMaps}
                  seatMapsLoading={seatMapsLoading}
                  seatMapsError={seatMapsError}
                  bagQuantities={duffelBagQuantities}
                  onBagQuantityChange={(serviceId, qty) =>
                    setDuffelBagQuantities((prev) => ({ ...prev, [serviceId]: qty }))
                  }
                  seatPassengerId={duffelSeatPassengerId}
                  onSeatPassengerChange={setDuffelSeatPassengerId}
                  seatSelections={duffelSeatSelections}
                  onSelectSeat={handleDuffelSelectSeat}
                  onBack={() => {}}
                  onContinueToPayment={() => {}}
                  payBusy={false}
                  pricingError={null}
                  showActions={false}
                  compact
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {type === "flight" && !flightOffer ? (
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Luggage className="h-4 w-4 text-foreground dark:text-white" strokeWidth={2} />
              {tb("extras")}
            </label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={extras.includes(EXTRA_BAGGAGE_ID)}
                  onChange={(e) =>
                    setExtras((prev) =>
                      e.target.checked
                        ? [...prev, EXTRA_BAGGAGE_ID]
                        : prev.filter((x) => x !== EXTRA_BAGGAGE_ID)
                    )
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{tb("extraBaggage50")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={extras.includes(EXTRA_SEAT_SELECTION_ID)}
                  onChange={(e) =>
                    setExtras((prev) =>
                      e.target.checked
                        ? [...prev, EXTRA_SEAT_SELECTION_ID]
                        : prev.filter((x) => x !== EXTRA_SEAT_SELECTION_ID)
                    )
                  }
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{tb("seatSelection25")}</span>
              </label>
            </div>
          </div>
        ) : null}

        <hr className="border-border border-dashed" />

        <div>
          {isChangeFlow && changeOffer && changeDelta !== null ? (
            <>
              {beforeChangeAmount ? (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tChange("previousTotal")}</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(
                      Number.parseFloat(beforeChangeAmount),
                      beforeChangeCurrency ?? changeCurrency,
                      locale,
                    )}
                  </span>
                </div>
              ) : null}
              {changeOffer.new_total_amount ? (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tChange("newOrderTotal")}</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(
                      Number.parseFloat(changeOffer.new_total_amount),
                      changeOffer.new_total_currency ?? changeCurrency,
                      locale,
                    )}
                  </span>
                </div>
              ) : null}
              {changeOffer.penalty_total_amount ? (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tChange("airlinePenalty")}</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(
                      Number.parseFloat(changeOffer.penalty_total_amount),
                      changeOffer.penalty_total_currency ?? changeCurrency,
                      locale,
                    )}
                  </span>
                </div>
              ) : null}
              <div className="mt-4 flex items-end justify-between">
                <span className="font-medium text-foreground">{tChange("changeCost")}</span>
                <span className="text-2xl font-bold text-primary">
                  {changeDelta < 0
                    ? tChange("refundAmount", {
                        amount: formatPrice(Math.abs(changeDelta), changeCurrency, locale),
                      })
                    : changeDelta === 0
                      ? tChange("noExtraCharge")
                      : formatPrice(changeDelta, changeCurrency, locale)}
                </span>
              </div>
              {quoteExpiresAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {tChange("quoteExpires", {
                    date: new Date(quoteExpiresAt).toLocaleString(locale),
                  })}
                </p>
              ) : null}
            </>
          ) : type === "flight" && flightOffer && duffelEstimates ? (
            <>
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tb("fare")}</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(duffelEstimates.base, flightOffer.total_currency, locale)}
                  </span>
                </div>
                {duffelEstimates.addOn > 0 ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{tb("selectedExtrasEst")}</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(duffelEstimates.addOn, flightOffer.total_currency, locale)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="font-medium text-muted-foreground">{tb("totalEst")}</span>
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(duffelEstimates.total, flightOffer.total_currency, locale)}
                </span>
              </div>
              <p className="mt-2 text-end text-xs text-muted-foreground">{tb("finalAmountDisclaimer")}</p>
            </>
          ) : (
            <>
              {type === "flight" && flightOffer ? (
                <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tCheckout("offerTotalLabel")}</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(
                      Number.parseFloat(flightOffer.total_amount),
                      flightOffer.total_currency,
                      locale,
                    )}
                  </span>
                </div>
              ) : type === "hotel" && (staysQuote?.totalAmount || totalRooms > 0) ? (
                <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tCheckout("lineRoom")}</span>
                  <span className="font-medium text-foreground">{priceStrDisplay}</span>
                </div>
              ) : (
                <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tb("price")}</span>
                  <span className="font-medium text-foreground">{priceStrDisplay}</span>
                </div>
              )}
              <div className="flex items-end justify-between gap-2">
                <span className="font-medium text-muted-foreground">{tCheckout("totalAmountLabel")}</span>
                <span className="text-3xl font-bold text-primary">{priceStrDisplay}</span>
              </div>
              <p className="mt-2 text-end text-xs text-muted-foreground">
                {type === "hotel" ? tCheckout("includesRoomTaxes") : tb("finalAmountDisclaimer")}
              </p>
              {type === "hotel" && requiresStaysQuote && !staysQuote && totalRooms > 0 ? (
                <p className="mt-1 text-end text-xs text-muted-foreground">{tb("hotelQuotePaymentHint")}</p>
              ) : null}
            </>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleProceedToPayment}
          disabled={hotelAwaitingStaysQuote || hotelProceedBusy}
        >
          {type === "hotel" && (hotelProceedBusy || staysQuoteLoading)
            ? tb("gettingQuote")
            : hotelMustPickRoom
              ? tb("selectRoom")
              : isChangeFlow
                ? tChange("continueToPayment")
                : tb("proceedToPayment")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {type === "car" && renderBookingCard()}

      {useMobileBottomSheet && (lgUp === true || lgUp === null) && (
        <div className="hidden lg:block">{renderBookingCard()}</div>
      )}

      {useMobileBottomSheet && lgUp === false && (
        <>
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
          >
            <div className="mx-auto w-full max-w-6xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isHotel && hotelMustPickRoom) {
                    setMobileBookingSheetOpen(false);
                    scrollToHotelAvailableRooms();
                    return;
                  }
                  setMobileBookingSheetOpen(true);
                }}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-0.5 py-1 text-start transition-opacity hover:opacity-90 active:opacity-80"
                aria-expanded={mobileBookingSheetOpen}
                aria-label={isFlight ? tb("viewFlightAria") : tb("viewHotelAria")}
              >
                <div className="min-w-0 flex-1">
                  {isHotel && staysQuoteLoading ? (
                    <p className="text-sm font-medium text-foreground">{tb("gettingQuote")}</p>
                  ) : isHotel && hotelMustPickRoom ? (
                    <p className="text-sm text-muted-foreground">{tb("selectRoomForTotal")}</p>
                  ) : isFlight && duffelEstimates ? (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {tb("totalEst")}
                      </p>
                      <p className="truncate text-base font-bold text-primary sm:text-lg">
                        {formatPrice(duffelEstimates.total, duffelEstimates.currency, locale)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tb("total")}</p>
                      <p className="truncate text-base font-bold text-primary sm:text-lg">{priceStrDisplay}</p>
                    </>
                  )}
                </div>
                <ChevronUp
                  className="h-5 w-5 shrink-0 text-primary transition-transform duration-200"
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <Sheet open={mobileBookingSheetOpen} onOpenChange={setMobileBookingSheetOpen}>
            <SheetContent
              side="bottom"
              className="flex h-auto max-h-[90vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 max-sm:px-0"
            >
              <SheetTitle className="sr-only">
                {isFlight ? tb("sheetFlightTitle") : tb("sheetHotelTitle")}
              </SheetTitle>
              <div className="max-h-[min(90vh,860px)] overflow-y-auto overscroll-contain px-3 py-1 pb-6 pt-0 sm:px-4 dropdown-scrollbar">
                {renderBookingCard()}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  );
}

/** Skeleton matching {@link BookingSidebar} chrome for detail-page loading states. */
export function BookingSidebarSkeleton() {
  return (
    <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm dropdown-scrollbar max-h-[calc(100vh-6rem)]" aria-hidden>
      <div className="flex items-center gap-3 border-b border-border bg-muted px-6 py-4">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-muted-foreground/20" aria-hidden />
        <div className="h-5 w-40 animate-pulse rounded-md bg-muted-foreground/15" aria-hidden />
      </div>
      <div className="space-y-2 p-4">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-6 w-full animate-pulse rounded-md bg-muted-foreground/15" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/25 p-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/25 p-3">
          <div className="h-4 w-28 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div>
          <div className="mb-2 h-4 w-16 animate-pulse rounded bg-muted-foreground/15" />
          <div className="space-y-2">
            <div className="h-5 w-full animate-pulse rounded bg-muted-foreground/10" />
            <div className="h-5 w-[85%] animate-pulse rounded bg-muted-foreground/10" />
          </div>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex justify-between">
            <span className="h-4 w-12 animate-pulse rounded bg-muted-foreground/15" />
            <span className="h-4 w-20 animate-pulse rounded bg-muted-foreground/15" />
          </div>
          <div className="flex justify-between">
            <span className="h-5 w-14 animate-pulse rounded bg-muted-foreground/15" />
            <span className="h-8 w-24 animate-pulse rounded-md bg-muted-foreground/15" />
          </div>
        </div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
      </div>
    </div>
  );
}
