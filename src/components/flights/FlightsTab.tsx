// @ts-nocheck - Phase 1: Complex component; full typing in Phase 3
"use client";
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { hydrateFlightsFormFromUrl } from "@/lib/flights/hydrate-flights-form-from-url";
import { persistFlightSearchPath } from "@/lib/flights/flight-search-url-session";
import {
  flightChangeSearchParamsFromHydrated,
  hydrateFlightsFormFromChangeUrl,
} from "@/lib/flights/hydrate-flights-form-from-change-url";
import { buildFlightChangeSearchUrl } from "@/lib/flights/flights-change-page-layout";
import { isChangeFlow, type FlowVariant, type OriginalBookingContext } from "@/lib/flights/flow-variant";
import { selectedSliceOption } from "@/lib/flights/build-original-booking-context";
import { writeFlightChangeSession, sortChangeOffersByCost } from "@/lib/flights/flight-change-session";
import { ApiRequestError } from "@/lib/http/api-client";
import { postFlightOrderChangeQuote } from "@/lib/http/flights.client";
import { cabinClassToDuffel, duffelCabinToUi } from "@/lib/validations/flights.schema";
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, Users, Search, ArrowLeftRight, X, Plus, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AIRPORTS } from "@/data/airports";
import { COMBO_FIELD_SHELL_CLASS, INPUT_FIELD_CLASS } from "@/components/ui/inputFieldStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin_ui/ui/select";
import { useDuffelAirportSuggest } from "@/components/flights/useDuffelAirportSuggest";
import {
  FlightSliceTimePopoverTrigger,
  type FlightSliceTimePopoverTriggerHandle,
} from "@/components/flights/FlightSliceTimePopoverTrigger";
import { PreferredAirlinesCombobox } from "@/components/flights/PreferredAirlinesCombobox";
import { FlightSliceTimePopover } from "@/components/flights/FlightSliceTimePopover";
import { FlightAirportSuggestSkeleton } from "@/components/flights/FlightSkeletons";
import { MobileFullscreenSearchOverlay } from "@/components/shared/mobile/MobileFullscreenSearchOverlay";
import { useMobileFullscreenInteraction } from "@/hooks/useMobileFullscreenInteraction";
import { cn } from "@/lib/utils";

const COMBO_TRIGGER_CLASS = `${COMBO_FIELD_SHELL_CLASS} cursor-pointer flex justify-between items-center font-medium `;

const POPULAR_AIRPORTS = AIRPORTS.slice(0, 10);

/** lg+ breakpoint only: 12-column rows for `variant="modal"` edit-search dialog. */
const MODAL_LG_GRID = {
  locations: "lg:col-span-12",
  date: "lg:col-span-6",
  travellersOneWayMulti: "lg:col-span-5",
  travellersRoundTrip: "lg:col-span-8",
  searchOneWayMulti: "lg:col-span-1",
  searchRoundTrip: "lg:col-span-4",
} as const;

/** YYYY-MM-DD in local time (avoids UTC shift from toISOString on calendar picks). */
function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDayFromParts(year: number, monthIndex: number, day: number) {
  const dt = new Date(year, monthIndex, day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function FlightsTab({
  tripType: externalTripType,
  setTripType: externalSetTripType,
  cabinClass: externalCabinClass,
  setCabinClass: externalSetCabinClass,
  travelers: externalTravelers,
  setTravelers: externalSetTravelers,
  showTravelerDropdown: externalShowTravelerDropdown,
  setShowTravelerDropdown: externalSetShowTravelerDropdown,
  variant = "page",
  flowVariant = "new-booking",
  originalBooking,
  onChangeSearchComplete,
  /** Close host chrome (edit-search dialog + mobile filters) before navigation on results page. */
  onFlightSearchStart,
}: {
  tripType?: string;
  setTripType?: (v: string) => void;
  cabinClass?: string;
  setCabinClass?: (v: string) => void;
  travelers?: { adults: number; children: number; infants: number };
  setTravelers?: (v: { adults: number; children: number; infants: number }) => void;
  showTravelerDropdown?: boolean;
  setShowTravelerDropdown?: (v: boolean) => void;
  /** `modal`: edit-search dialog; lg+ uses dedicated 12-column rows (see `MODAL_LG_GRID`). */
  variant?: "page" | "modal";
  flowVariant?: FlowVariant;
  originalBooking?: OriginalBookingContext;
  onChangeSearchComplete?: (result: { changeId: string; offers: import("@/lib/http/flights.client").FlightOrderChangeOffer[] }) => void;
  onFlightSearchStart?: () => void;
} = {}) {
  // Internal state for when props aren't provided
  const [internalTripType, setInternalTripType] = useState("one-way");
  const [internalCabinClass, setInternalCabinClass] = useState("economy");
  const [internalTravelers, setInternalTravelers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [internalShowTravelerDropdown, setInternalShowTravelerDropdown] = useState(false);

  // Use external props if provided, otherwise use internal state
  const tripType = externalTripType !== undefined ? externalTripType : internalTripType;
  const setTripType = externalSetTripType !== undefined ? externalSetTripType : setInternalTripType;
  const cabinClass = externalCabinClass !== undefined ? externalCabinClass : internalCabinClass;
  const setCabinClass = externalSetCabinClass !== undefined ? externalSetCabinClass : setInternalCabinClass;
  const travelers = externalTravelers !== undefined ? externalTravelers : internalTravelers;
  const setTravelers = externalSetTravelers !== undefined ? externalSetTravelers : setInternalTravelers;
  const showTravelerDropdown = externalShowTravelerDropdown !== undefined ? externalShowTravelerDropdown : internalShowTravelerDropdown;
  const setShowTravelerDropdown = externalSetShowTravelerDropdown !== undefined ? externalSetShowTravelerDropdown : setInternalShowTravelerDropdown;

  const isModal = variant === "modal";
  const isChange = isChangeFlow(flowVariant);
  const [changeSearchBusy, setChangeSearchBusy] = useState(false);
  const [changeSearchError, setChangeSearchError] = useState<string | null>(null);
  const changePrefilledRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const flightSearchQueryKey = searchParams.toString();
  const ft = useTranslations("Flights.tab");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const calendarWeekdays = useMemo(
    () => [
      ft("calendarDaySun"),
      ft("calendarDayMon"),
      ft("calendarDayTue"),
      ft("calendarDayWed"),
      ft("calendarDayThu"),
      ft("calendarDayFri"),
      ft("calendarDaySat"),
    ],
    [ft],
  );

  const tripTypeOptions = useMemo(
    () => [
      { id: "one-way", label: ft("tripOneWay") },
      { id: "round-trip", label: ft("tripRoundTrip") },
      { id: "multi-city", label: ft("tripMultiCity") },
    ],
    [ft],
  );

  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [fromHighlightIndex, setFromHighlightIndex] = useState(-1);
  const [toHighlightIndex, setToHighlightIndex] = useState(-1);
  const [selectedFromAirport, setSelectedFromAirport] = useState(null);
  const [selectedToAirport, setSelectedToAirport] = useState(null);
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [showDepartDatePicker, setShowDepartDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  /** Which airport/date field owns the open inline panel (e.g. `from:2`, `depart:1`). */
  const [activeAirportPanelKey, setActiveAirportPanelKey] = useState<string | null>(null);
  const [activeDatePanelKey, setActiveDatePanelKey] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [returnCurrentMonth, setReturnCurrentMonth] = useState(
    new Date().getMonth()
  );
  const [returnCurrentYear, setReturnCurrentYear] = useState(
    new Date().getFullYear()
  );

  // Multi-city states
  const [flights, setFlights] = useState([
    { id: 1, from: null, to: null, date: "" },
  ]);

  const [childAges, setChildAges] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advMaxConnections, setAdvMaxConnections] = useState<string>("");
  const [advSupplierTimeout, setAdvSupplierTimeout] = useState(60000);
  const [s0DepFrom, setS0DepFrom] = useState("");
  const [s0DepTo, setS0DepTo] = useState("");
  const [s0ArrFrom, setS0ArrFrom] = useState("");
  const [s0ArrTo, setS0ArrTo] = useState("");
  const [s1DepFrom, setS1DepFrom] = useState("");
  const [s1DepTo, setS1DepTo] = useState("");
  const [s1ArrFrom, setS1ArrFrom] = useState("");
  const [s1ArrTo, setS1ArrTo] = useState("");
  const [preferredCarrierIatas, setPreferredCarrierIatas] = useState<string[]>([]);

  const departDatePickerRef = useRef(null);
  const returnDatePickerRef = useRef(null);
  const departTimeTriggerRef = useRef<FlightSliceTimePopoverTriggerHandle>(null);
  const returnTimeTriggerRef = useRef<FlightSliceTimePopoverTriggerHandle>(null);
  const travelerDropdownRef = useRef(null);
  const advancedDropdownRef = useRef(null);
  const fromDropdownRef = useRef(null);
  const toDropdownRef = useRef(null);
  const fromSearchInputRef = useRef(null);
  const toSearchInputRef = useRef(null);

  const fromAirportSuggestOpen =
    activeAirportPanelKey === "from" || (activeAirportPanelKey?.startsWith("from:") ?? false);
  const toAirportSuggestOpen =
    activeAirportPanelKey === "to" || (activeAirportPanelKey?.startsWith("to:") ?? false);

  const { rows: fromAirportApiRows, loading: fromAirportLoading } = useDuffelAirportSuggest(
    fromAirportSuggestOpen,
    fromSearch,
  );
  const { rows: toAirportApiRows, loading: toAirportLoading } = useDuffelAirportSuggest(
    toAirportSuggestOpen,
    toSearch,
  );

  const {
    isMobile,
    activeField,
    openField,
    closeField,
    showInlinePanel,
  } = useMobileFullscreenInteraction();

  const parseMobileFieldKey = useCallback((key: string | null) => {
    if (!key) return null;
    const colon = key.indexOf(":");
    if (colon === -1) return { type: key, flightId: null as number | null };
    return {
      type: key.slice(0, colon),
      flightId: Number(key.slice(colon + 1)) || null,
    };
  }, []);

  const closeAllPanels = useCallback(() => {
    setShowDepartDatePicker(false);
    setShowReturnDatePicker(false);
    setShowTravelerDropdown(false);
    setShowFromDropdown(false);
    setShowToDropdown(false);
    setActiveAirportPanelKey(null);
    setActiveDatePanelKey(null);
    setFromSearch("");
    setToSearch("");
    setFromHighlightIndex(-1);
    setToHighlightIndex(-1);
    setShowAdvanced(false);
    departTimeTriggerRef.current?.close();
    returnTimeTriggerRef.current?.close();
    closeField();
  }, [closeField]);

  const airportFieldKey = useCallback((type: "from" | "to", flightId: number | null) => {
    return flightId != null ? `${type}:${flightId}` : type;
  }, []);

  const dateFieldKey = useCallback((isReturn: boolean, flightId: number | null) => {
    if (flightId != null) return `depart:${flightId}`;
    return isReturn ? "return" : "depart";
  }, []);

  const openAirportField = useCallback(
    (type: "from" | "to", flightId: number | null) => {
      const key = airportFieldKey(type, flightId);
      setShowDepartDatePicker(false);
      setShowReturnDatePicker(false);
      setActiveDatePanelKey(null);

      if (isMobile) {
        openField(key);
        setActiveAirportPanelKey(key);
        if (type === "from") {
          setShowFromDropdown(true);
          setShowToDropdown(false);
          setFromSearch("");
        } else {
          setShowToDropdown(true);
          setShowFromDropdown(false);
          setToSearch("");
        }
        return;
      }

      const isSameField = activeAirportPanelKey === key;
      if (isSameField) {
        setActiveAirportPanelKey(null);
        setShowFromDropdown(false);
        setShowToDropdown(false);
        setFromSearch("");
        setToSearch("");
        return;
      }

      setActiveAirportPanelKey(key);
      if (type === "from") {
        setShowFromDropdown(true);
        setShowToDropdown(false);
        setFromSearch("");
      } else {
        setShowToDropdown(true);
        setShowFromDropdown(false);
        setToSearch("");
      }
    },
    [activeAirportPanelKey, airportFieldKey, isMobile, openField],
  );

  const openDateField = useCallback(
    (isReturn: boolean, flightId: number | null) => {
      if (isReturn) returnTimeTriggerRef.current?.close();
      else departTimeTriggerRef.current?.close();
      const key = dateFieldKey(isReturn, flightId);
      setShowFromDropdown(false);
      setShowToDropdown(false);
      setActiveAirportPanelKey(null);
      setFromSearch("");
      setToSearch("");

      if (isMobile) {
        openField(key);
        setActiveDatePanelKey(key);
        if (isReturn) setShowReturnDatePicker(true);
        else setShowDepartDatePicker(true);
        return;
      }

      const isSameField = activeDatePanelKey === key;
      if (isReturn) {
        const nextOpen = isSameField ? !showReturnDatePicker : true;
        setShowReturnDatePicker(nextOpen);
        setShowDepartDatePicker(false);
        setActiveDatePanelKey(nextOpen ? key : null);
      } else {
        const nextOpen = isSameField ? !showDepartDatePicker : true;
        setShowDepartDatePicker(nextOpen);
        setShowReturnDatePicker(false);
        setActiveDatePanelKey(nextOpen ? key : null);
      }
    },
    [
      activeDatePanelKey,
      dateFieldKey,
      isMobile,
      openField,
      showDepartDatePicker,
      showReturnDatePicker,
    ],
  );

  const openTravelersField = useCallback(() => {
    if (isChange) return;
    if (isMobile) {
      openField("travelers");
      setShowTravelerDropdown(true);
    } else {
      setShowTravelerDropdown((v) => !v);
    }
  }, [isChange, isMobile, openField]);

  const openAdvancedField = useCallback(() => {
    if (isMobile) {
      openField("advanced");
      setShowAdvanced(true);
    } else {
      setShowAdvanced((v) => !v);
    }
  }, [isMobile, openField]);

  const fromListItems = useMemo(() => {
    const needle = fromSearch.trim();
    if (needle.length < 2) {
      return POPULAR_AIRPORTS.map((a) => ({ kind: "popular", a }));
    }
    return fromAirportApiRows.map((dto) => ({ kind: "api", dto }));
  }, [fromSearch, fromAirportApiRows]);

  const toListItems = useMemo(() => {
    const needle = toSearch.trim();
    if (needle.length < 2) {
      return POPULAR_AIRPORTS.map((a) => ({ kind: "popular", a }));
    }
    return toAirportApiRows.map((dto) => ({ kind: "api", dto }));
  }, [toSearch, toAirportApiRows]);

  useEffect(() => {
    setFromHighlightIndex(-1);
  }, [fromSearch, fromAirportApiRows, showFromDropdown]);

  useEffect(() => {
    setToHighlightIndex(-1);
  }, [toSearch, toAirportApiRows, showToDropdown]);

  useEffect(() => {
    setChildAges((prev) => {
      const n = travelers.children;
      const next = prev.slice(0, n);
      while (next.length < n) next.push(8);
      return next;
    });
  }, [travelers.children]);

  useLayoutEffect(() => {
    if (!isChange) return;
    const h = hydrateFlightsFormFromChangeUrl(new URLSearchParams(searchParams.toString()));
    if (!h) return;
    setTripType("one-way");
    setCabinClass(h.cabinClass);
    setTravelers(h.travelers);
    setChildAges(h.childAges.length > 0 ? h.childAges : []);
    setSelectedFromAirport(h.selectedFromAirport);
    setSelectedToAirport(h.selectedToAirport);
    setDepartDate(h.departDate);
    setReturnDate("");
    setCurrentMonth(h.currentMonth);
    setCurrentYear(h.currentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- change URL sync
  }, [flightSearchQueryKey, isChange]);

  useLayoutEffect(() => {
    if (isChange) return;
    const h = hydrateFlightsFormFromUrl(new URLSearchParams(searchParams.toString()));
    if (!h) return;
    setTripType(h.tripType);
    setCabinClass(h.cabinClass);
    setTravelers(h.travelers);
    setChildAges(h.childAges.length > 0 ? h.childAges : []);
    setSelectedFromAirport(h.selectedFromAirport);
    setSelectedToAirport(h.selectedToAirport);
    setDepartDate(h.departDate);
    setReturnDate(h.returnDate);
    setFlights(h.flights);
    setAdvMaxConnections(h.advMaxConnections);
    setAdvSupplierTimeout(h.advSupplierTimeout);
    setPreferredCarrierIatas(h.preferredCarrierIatas);
    setS0DepFrom(h.s0DepFrom);
    setS0DepTo(h.s0DepTo);
    setS0ArrFrom(h.s0ArrFrom);
    setS0ArrTo(h.s0ArrTo);
    setS1DepFrom(h.s1DepFrom);
    setS1DepTo(h.s1DepTo);
    setS1ArrFrom(h.s1ArrFrom);
    setS1ArrTo(h.s1ArrTo);
    setCurrentMonth(h.currentMonth);
    setCurrentYear(h.currentYear);
    setReturnCurrentMonth(h.returnCurrentMonth);
    setReturnCurrentYear(h.returnCurrentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form to URL only when the query string identity changes
  }, [flightSearchQueryKey, isChange]);

  useLayoutEffect(() => {
    if (!isChange || !originalBooking || changePrefilledRef.current) return;
    changePrefilledRef.current = true;
    const slice = selectedSliceOption(originalBooking);
    if (!slice) return;
    setTripType("one-way");
    const fromCode = slice.origin_iata;
    const toCode = slice.destination_iata;
    const fromAp = AIRPORTS.find((a) => a.code === fromCode) ?? {
      code: fromCode,
      name: fromCode,
      city: "",
      country: "",
    };
    const toAp = AIRPORTS.find((a) => a.code === toCode) ?? {
      code: toCode,
      name: toCode,
      city: "",
      country: "",
    };
    setSelectedFromAirport(fromAp);
    setSelectedToAirport(toAp);
    if (slice.departure_date) setDepartDate(slice.departure_date);
    if (slice.cabin_class) setCabinClass(duffelCabinToUi(slice.cabin_class));
    const pax = originalBooking.flight
      ? { adults: 1, children: 0, infants: 0 }
      : { adults: 1, children: 0, infants: 0 };
    const snap = originalBooking.itinerarySnapshot;
    if (snap && typeof snap === "object" && Array.isArray((snap as { passengers?: unknown }).passengers)) {
      const paxList = (snap as { passengers: { type?: string }[] }).passengers;
      let adults = 0;
      let children = 0;
      let infants = 0;
      for (const p of paxList) {
        const t = (p.type ?? "adult").toLowerCase();
        if (t === "child") children += 1;
        else if (t === "infant_without_seat" || t === "infant") infants += 1;
        else adults += 1;
      }
      setTravelers({ adults: Math.max(1, adults), children, infants });
    } else {
      setTravelers(pax);
    }
  }, [isChange, originalBooking]);

  const appendSliceTimes = (p, idx, depFrom, depTo, arrFrom, arrTo) => {
    if (depFrom) p.set(`s${idx}_dep_from`, depFrom);
    if (depTo) p.set(`s${idx}_dep_to`, depTo);
    if (arrFrom) p.set(`s${idx}_arr_from`, arrFrom);
    if (arrTo) p.set(`s${idx}_arr_to`, arrTo);
  };

  const buildFlightsSearchUrl = () => {
    const cabinDuffel = cabinClassToDuffel(cabinClass);
    const p = new URLSearchParams();
    p.set("cabin_class", cabinDuffel);
    p.set("adults", String(travelers.adults));
    p.set("children", String(travelers.children));
    p.set("infants", String(travelers.infants));
    if (travelers.children > 0 && childAges.length > 0) {
      p.set(
        "child_ages",
        childAges
          .slice(0, travelers.children)
          .map((a) => String(Math.min(17, Math.max(0, a))))
          .join(","),
      );
    }
    if (advMaxConnections !== "" && advMaxConnections != null) {
      p.set("max_connections", String(advMaxConnections));
    }
    if (advSupplierTimeout > 0) {
      p.set("supplier_timeout", String(Math.round(advSupplierTimeout)));
    }
    preferredCarrierIatas
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length >= 2 && c.length <= 3)
      .forEach((c) => p.append("carrier_iata", c));

    if (tripType === "multi-city") {
      const slices = flights
        .filter((f) => f.from?.code && f.to?.code && f.date)
        .map((f) => ({
          origin: f.from.code,
          destination: f.to.code,
          departure_date: f.date,
        }));
      if (slices.length === 0) return null;
      p.set("slices", JSON.stringify(slices));
      appendSliceTimes(p, 0, s0DepFrom, s0DepTo, s0ArrFrom, s0ArrTo);
    } else {
      if (!selectedFromAirport?.code || !selectedToAirport?.code || !departDate) return null;
      p.set("origin", selectedFromAirport.code);
      p.set("destination", selectedToAirport.code);
      p.set("departure_date", departDate);
      if (tripType === "round-trip" && returnDate) {
        p.set("return_date", returnDate);
        p.set("trip", "round_trip");
        appendSliceTimes(p, 0, s0DepFrom, s0DepTo, s0ArrFrom, s0ArrTo);
        appendSliceTimes(p, 1, s1DepFrom, s1DepTo, s1ArrFrom, s1ArrTo);
      } else {
        p.set("trip", "one_way");
        appendSliceTimes(p, 0, s0DepFrom, s0DepTo, s0ArrFrom, s0ArrTo);
      }
    }
    return `/flights?${p.toString()}`;
  };

  const onChangeSearchNavigate = async () => {
    if (!originalBooking) return;
    const sliceId = originalBooking.selectedSliceId;
    const cabinMap: Record<string, string> = {
      economy: "economy",
      "premium-economy": "premium_economy",
      business: "business",
      first: "first",
    };
    const urlParams = flightChangeSearchParamsFromHydrated({
      sliceId,
      selectedFromAirport,
      selectedToAirport,
      departDate,
      cabinClass,
      travelers,
    });
    if (!urlParams) return;

    setChangeSearchBusy(true);
    setChangeSearchError(null);
    try {
      const result = await postFlightOrderChangeQuote(originalBooking.bookingId, {
        selected_slice_id: sliceId,
        departure_date: urlParams.departure_date,
        origin: urlParams.origin,
        destination: urlParams.destination,
        cabin_class: cabinMap[cabinClass] as "economy" | "premium_economy" | "business" | "first",
      });
      const sorted = sortChangeOffersByCost(result.offers);
      const paxTotal = travelers.adults + travelers.children + travelers.infants;
      writeFlightChangeSession(originalBooking.bookingId, {
        selectedSliceId: sliceId,
        origin: urlParams.origin,
        destination: urlParams.destination,
        departureDate: urlParams.departure_date,
        cabinClass: urlParams.cabin_class,
        changeId: result.id,
        offers: sorted,
        quoteExpiresAt: result.quote_expires_at,
        bookingRefNo: originalBooking.bookingRefNo,
        beforeChangeAmount: String(originalBooking.totalAmount),
        beforeChangeCurrency: originalBooking.currency,
        selectedSliceIndex: originalBooking.selectedSliceIndex,
        searchSummary: {
          route: `${urlParams.origin} → ${urlParams.destination}`,
          dateLabel: urlParams.departure_date,
          passengerCount: paxTotal,
        },
      });
      onChangeSearchComplete?.({ changeId: result.id, offers: sorted });
      onFlightSearchStart?.();
      router.push(
        buildFlightChangeSearchUrl(originalBooking.bookingId, urlParams, {
          changeId: result.id,
        }),
      );
    } catch (e) {
      setChangeSearchError(
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not search for changes.",
      );
    } finally {
      setChangeSearchBusy(false);
    }
  };

  const onSearchNavigate = () => {
    if (isChange) {
      void onChangeSearchNavigate();
      return;
    }
    const href = buildFlightsSearchUrl();
    if (!href) return;
    persistFlightSearchPath(href);
    onFlightSearchStart?.();
    router.push(href);
  };

  // Close dropdowns when clicking outside (desktop inline panels only)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (
        showDepartDatePicker &&
        activeDatePanelKey &&
        !target.closest("[data-flight-date-panel]")
      ) {
        setShowDepartDatePicker(false);
        setActiveDatePanelKey(null);
      }
      if (
        showReturnDatePicker &&
        activeDatePanelKey &&
        !target.closest("[data-flight-date-panel]")
      ) {
        setShowReturnDatePicker(false);
        setActiveDatePanelKey(null);
      }
      if (
        travelerDropdownRef.current &&
        !travelerDropdownRef.current.contains(target)
      ) {
        setShowTravelerDropdown(false);
      }
      if (
        advancedDropdownRef.current &&
        !advancedDropdownRef.current.contains(target)
      ) {
        setShowAdvanced(false);
      }
      if (
        activeAirportPanelKey &&
        (showFromDropdown || showToDropdown) &&
        !target.closest("[data-flight-airport-field]")
      ) {
        setActiveAirportPanelKey(null);
        setShowFromDropdown(false);
        setShowToDropdown(false);
        setFromSearch("");
        setToSearch("");
        setFromHighlightIndex(-1);
        setToHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    activeAirportPanelKey,
    activeDatePanelKey,
    isMobile,
    showDepartDatePicker,
    showFromDropdown,
    showReturnDatePicker,
    showToDropdown,
  ]);

  // Close all dropdowns on Escape key (Phase 5 - Accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isMobile && activeField) {
        closeAllPanels();
        return;
      }
      closeAllPanels();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeField, closeAllPanels, isMobile]);

  // Focus search input when dropdown opens
  useEffect(() => {
    const isFromKey =
      activeAirportPanelKey === "from" || (activeAirportPanelKey?.startsWith("from:") ?? false);
    if (!isMobile && showFromDropdown && isFromKey && fromSearchInputRef.current) {
      const t = window.setTimeout(() => {
        fromSearchInputRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [activeAirportPanelKey, isMobile, showFromDropdown]);

  useEffect(() => {
    const isToKey =
      activeAirportPanelKey === "to" || (activeAirportPanelKey?.startsWith("to:") ?? false);
    if (!isMobile && showToDropdown && isToKey && toSearchInputRef.current) {
      const t = window.setTimeout(() => {
        toSearchInputRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [activeAirportPanelKey, isMobile, showToDropdown]);

  // Multi-city functions
  const addFlight = () => {
    const newFlight = {
      id: flights.length + 1,
      from: null,
      to: null,
      date: "",
    };
    setFlights([...flights, newFlight]);
  };

  const removeFlight = (id) => {
    if (flights.length > 1) {
      setFlights(flights.filter((flight) => flight.id !== id));
    }
  };

  const updateFlight = (id, field, value) => {
    setFlights(
      flights.map((flight) =>
        flight.id === id ? { ...flight, [field]: value } : flight
      )
    );
  };

  const updateTravelers = (type, operation) => {
    setTravelers((prev) => {
      const newValue =
        operation === "increment"
          ? prev[type] + 1
          : Math.max(0, prev[type] - 1);
      return { ...prev, [type]: newValue };
    });
  };

  const getTravelerText = () => {
    if (!travelers) {
      return ft("travelerCount", { count: 1 });
    }

    const { adults, children, infants } = travelers;
    const totalTravelers = adults + children + infants;
    return ft("travelerCount", { count: totalTravelers });
  };
  const getFromDisplayText = (flight = null) => {
    const airport = flight ? flight.from : selectedFromAirport;
    if (airport) {
      return `${airport.city} (${airport.code})`;
    }
    return ft("selectCity");
  };

  const getToDisplayText = (flight = null) => {
    const airport = flight ? flight.to : selectedToAirport;
    if (airport) {
      return `${airport.city} (${airport.code})`;
    }
    return ft("selectCity");
  };

  const formatDateSegmentsDisplay = (iso: string): React.ReactNode => {
    if (!iso) return <span className="text-muted-foreground">{ft("selectDate")}</span>;
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return (
      <span className="flex items-baseline gap-1.5 font-semibold tabular-nums text-foreground">
        <span>{d}</span>
        <span className="font-normal text-muted-foreground">/</span>
        <span>{m}</span>
        <span className="font-normal text-muted-foreground">/</span>
        <span>{y}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return ft("selectDate");
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleFromAirportSelect = (airport, flightId = null) => {
    if (flightId) {
      updateFlight(flightId, "from", airport);
    } else {
      setSelectedFromAirport(airport);
    }
    closeAllPanels();
  };

  const handleToAirportSelect = (airport, flightId = null) => {
    if (flightId) {
      updateFlight(flightId, "to", airport);
    } else {
      setSelectedToAirport(airport);
    }
    closeAllPanels();
  };

  function selectAirportListItem(which, index, flightId) {
    const items = which === "from" ? fromListItems : toListItems;
    const row = items[index];
    if (!row) return;
    if (row.kind === "popular") {
      if (which === "from") handleFromAirportSelect(row.a, flightId);
      else handleToAirportSelect(row.a, flightId);
    } else {
      const airport = {
        code: row.dto.iata_code,
        name: row.dto.name,
        city: row.dto.city_name || "",
        country: "",
      };
      if (which === "from") handleFromAirportSelect(airport, flightId);
      else handleToAirportSelect(airport, flightId);
    }
    if (which === "from") setFromHighlightIndex(-1);
    else setToHighlightIndex(-1);
  }

  function handleAirportSearchKeyDown(isFrom, e, flightId) {
    const showDropdown = isFrom ? showFromDropdown : showToDropdown;
    const search = isFrom ? fromSearch : toSearch;
    const loading = isFrom ? fromAirportLoading : toAirportLoading;
    const listItems = isFrom ? fromListItems : toListItems;
    const highlightIndex = isFrom ? fromHighlightIndex : toHighlightIndex;
    const setHighlightIndex = isFrom ? setFromHighlightIndex : setToHighlightIndex;

    if (!showDropdown) return;
    if (loading && search.trim().length >= 2) return;

    const len = listItems.length;
    if (len === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1 >= len ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? len - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < len) {
        e.preventDefault();
        selectAirportListItem(isFrom ? "from" : "to", highlightIndex, flightId);
      }
    }
  }

  // Fixed Swap function to exchange from and to airports
  const swapAirports = (flightId = null) => {
    if (tripType === "multi-city" && flightId) {
      // For multi-city flights, swap the specific flight's airports
      setFlights(currentFlights =>
        currentFlights.map(flight => {
          if (flight.id === flightId && flight.from && flight.to) {
            return { ...flight, from: flight.to, to: flight.from };
          }
          return flight;
        })
      );
    } else {
      // For one-way and round-trip, swap the main airports
      if (selectedFromAirport && selectedToAirport) {
        const temp = selectedFromAirport;
        setSelectedFromAirport(selectedToAirport);
        setSelectedToAirport(temp);
      }
    }
  };

  // Date picker functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  };

  const handleDepartDateSelect = (day, month, year) => {
    const selectedDate = new Date(year, month, day);
    const formattedDate = toLocalYmd(selectedDate);
    setDepartDate(formattedDate);
    setReturnDate((prev) => (prev && prev < formattedDate ? formattedDate : prev));
    closeAllPanels();
  };

  const handleReturnDateSelect = (day, month, year) => {
    const selectedDate = new Date(year, month, day);
    const formattedDate = toLocalYmd(selectedDate);
    setReturnDate(formattedDate);
    closeAllPanels();
  };

  const handleFlightDateSelect = (flightId, day, month, year) => {
    const selectedDate = new Date(year, month, day);
    const formattedDate = toLocalYmd(selectedDate);
    updateFlight(flightId, "date", formattedDate);
    closeAllPanels();
  };

  const nextMonth = (isReturn = false) => {
    if (isReturn) {
      if (returnCurrentMonth === 11) {
        setReturnCurrentMonth(0);
        setReturnCurrentYear(returnCurrentYear + 1);
      } else {
        setReturnCurrentMonth(returnCurrentMonth + 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const prevMonth = (isReturn = false) => {
    if (isReturn) {
      if (returnCurrentMonth === 0) {
        setReturnCurrentMonth(11);
        setReturnCurrentYear(returnCurrentYear - 1);
      } else {
        setReturnCurrentMonth(returnCurrentMonth - 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const renderCalendar = (isReturn = false, flightId = null) => {
    const year = isReturn ? returnCurrentYear : currentYear;
    const month = isReturn ? returnCurrentMonth : currentMonth;
    const selectedDate = isReturn
      ? returnDate
      : flightId
        ? flights.find((f) => f.id === flightId)?.date
        : departDate;

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];

    const minSelectableForCell = () => {
      if (flightId) return today;
      if (isReturn) {
        if (!departDate) return today;
        const [dy, dm, dd] = departDate.split("-").map(Number);
        const depStart = startOfLocalDayFromParts(dy, dm - 1, dd);
        return depStart > today ? depStart : today;
      }
      return today;
    };
    const minSelectable = minSelectableForCell();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const cellStart = startOfLocalDayFromParts(year, month, day);
      const isToday = cellStart.getTime() === today.getTime();
      const isSelected =
        selectedDate &&
        toLocalYmd(currentDate) === selectedDate;
      const disabled = cellStart < minSelectable;

      days.push(
        <button
          key={day}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (flightId) {
              handleFlightDateSelect(flightId, day, month, year);
            } else if (isReturn) {
              handleReturnDateSelect(day, month, year);
            } else {
              handleDepartDateSelect(day, month, year);
            }
          }}
          className={`h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 ${
            disabled
              ? "cursor-not-allowed text-muted-foreground/35 opacity-40"
              : isSelected
                ? "bg-primary text-primary-foreground"
                : isToday
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderAirportPanelBody = (isFrom: boolean, flightId: number | null) => {
    const search = isFrom ? fromSearch : toSearch;
    const listItems = isFrom ? fromListItems : toListItems;
    const loading = isFrom ? fromAirportLoading : toAirportLoading;
    const highlightIndex = isFrom ? fromHighlightIndex : toHighlightIndex;
    const setHighlightIndex = isFrom ? setFromHighlightIndex : setToHighlightIndex;

    return (
      <>
        {search.trim().length < 2 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
            {ft("popularAirportsHint")}
          </div>
        ) : null}
        <div
          className="py-1"
          role="listbox"
          aria-label={isFrom ? ft("ariaOriginAirports") : ft("ariaDestinationAirports")}
        >
          {loading && search.trim().length >= 2 ? (
            <FlightAirportSuggestSkeleton rows={6} />
          ) : search.trim().length >= 2 && listItems.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">{ft("noMatchingAirports")}</div>
          ) : (
            listItems.map((item, index) => {
              if (item.kind === "popular") {
                const airport = item.a;
                return (
                  <div
                    key={`popular-${airport.code}-${index}`}
                    role="option"
                    aria-selected={highlightIndex === index}
                    className={cn(
                      "px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-b-0",
                      highlightIndex === index && "bg-primary/10 ring-1 ring-inset ring-primary/20",
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectAirportListItem(isFrom ? "from" : "to", index, flightId)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-foreground">{airport.city}</div>
                        <div className="text-xs text-muted-foreground">{airport.name}</div>
                      </div>
                      <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {airport.code}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{airport.country}</div>
                  </div>
                );
              }
              const dto = item.dto;
              return (
                <div
                  key={`api-${dto.iata_code}-${index}`}
                  role="option"
                  aria-selected={highlightIndex === index}
                  className={cn(
                    "px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-b-0",
                    highlightIndex === index && "bg-primary/10 ring-1 ring-inset ring-primary/20",
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectAirportListItem(isFrom ? "from" : "to", index, flightId)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-foreground">{dto.city_name || ""}</div>
                      <div className="text-xs text-muted-foreground">{dto.name}</div>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {dto.iata_code}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  };

  const renderAirportSearchInput = (isFrom: boolean, flightId: number | null) => {
    const search = isFrom ? fromSearch : toSearch;
    const setSearch = isFrom ? setFromSearch : setToSearch;
    const searchInputRef = isFrom ? fromSearchInputRef : toSearchInputRef;

    return (
      <div className={COMBO_FIELD_SHELL_CLASS}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={ft("filterPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => handleAirportSearchKeyDown(isFrom, e, flightId)}
          className="w-full h-full bg-transparent border-none outline-none text-foreground font-medium placeholder-muted-foreground"
          autoFocus
        />
      </div>
    );
  };

  const renderCalendarPanelContent = (isReturn: boolean, flightId: number | null) => (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => prevMonth(isReturn)}
          className="rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {formatMonthYear(
            new Date(
              isReturn ? returnCurrentYear : currentYear,
              isReturn ? returnCurrentMonth : currentMonth,
            ),
          )}
        </h3>
        <button
          type="button"
          onClick={() => nextMonth(isReturn)}
          className="rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {calendarWeekdays.map((day) => (
          <div
            key={day}
            className="flex h-8 w-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderCalendar(isReturn, flightId)}</div>
    </>
  );

  const renderTravelerPanelBody = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">{ft("adultsLabel")}</span>
        <div className="flex items-center gap-3">
          {!isChange ? (
            <>
              <button
                type="button"
                onClick={() => updateTravelers("adults", "decrement")}
                className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={travelers.adults <= 1}
              >
                -
              </button>
            </>
          ) : null}
          <span className="text-sm font-bold w-6 text-center text-muted-foreground">{travelers.adults}</span>
          {!isChange ? (
            <button
              type="button"
              onClick={() => updateTravelers("adults", "increment")}
              className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">{ft("childrenLabel")}</span>
        <div className="flex items-center gap-3">
          {!isChange ? (
            <button
              type="button"
              onClick={() => updateTravelers("children", "decrement")}
              className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={travelers.children <= 0}
            >
              -
            </button>
          ) : null}
          <span className="text-sm font-bold w-6 text-center text-muted-foreground">{travelers.children}</span>
          {!isChange ? (
            <button
              type="button"
              onClick={() => updateTravelers("children", "increment")}
              className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">{ft("infantsLabel")}</span>
        <div className="flex items-center gap-3">
          {!isChange ? (
            <button
              type="button"
              onClick={() => updateTravelers("infants", "decrement")}
              className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={travelers.infants <= 0}
            >
              -
            </button>
          ) : null}
          <span className="text-sm font-bold w-6 text-center text-muted-foreground">{travelers.infants}</span>
          {!isChange ? (
            <button
              type="button"
              onClick={() => updateTravelers("infants", "increment")}
              className="w-8 h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      {travelers.children > 0 ? (
        <div className="border-t border-border pt-3 mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">{ft("childAgeHint")}</p>
          {childAges.slice(0, travelers.children).map((age, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{ft("childLabel", { n: idx + 1 })}</span>
              <select
                className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
                value={age}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setChildAges((prev) => {
                    const next = [...prev];
                    next[idx] = v;
                    return next;
                  });
                }}
              >
                {Array.from({ length: 16 }, (_, i) => i + 2).map((a) => (
                  <option key={a} value={a}>
                    {ft("yearsOld", { years: a })}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  const renderAdvancedPanelBody = () => (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      <div className="md:col-span-3">
        <label className="text-xs font-bold text-foreground">{ft("classLabel")}</label>
        <div className="relative mt-1">
          <select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value)}
            className={`w-full ${INPUT_FIELD_CLASS} h-12 appearance-none py-2.5 font-medium text-muted-foreground`}
          >
            <option value="economy">{ft("cabinEconomy")}</option>
            <option value="premium-economy">{ft("cabinPremiumEconomy")}</option>
            <option value="business">{ft("cabinBusiness")}</option>
            <option value="first-class">{ft("cabinFirstClass")}</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-bold text-muted-foreground">{ft("maxConnectionsLabel")}</label>
        <div className="relative mt-1">
          <Select
            value={advMaxConnections === "" ? "any" : advMaxConnections}
            onValueChange={(v) => setAdvMaxConnections(v === "any" ? "" : v)}
          >
            <SelectTrigger className={`${INPUT_FIELD_CLASS} h-12 py-2.5 font-medium text-muted-foreground`}>
              <SelectValue placeholder={ft("maxConnectionsAny")} />
            </SelectTrigger>
            <SelectContent className="z-[250]">
              <SelectItem value="any">{ft("maxConnectionsAny")}</SelectItem>
              <SelectItem value="0">{ft("maxConnectionsDirect")}</SelectItem>
              <SelectItem value="1">{ft("maxConnectionsOne")}</SelectItem>
              <SelectItem value="2">{ft("maxConnectionsTwo")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-bold text-muted-foreground">{ft("supplierTimeoutLabel")}</label>
        <input
          type="number"
          min={5000}
          max={120000}
          step={1000}
          value={advSupplierTimeout}
          onChange={(e) => setAdvSupplierTimeout(parseInt(e.target.value, 10) || 60000)}
          className={INPUT_FIELD_CLASS}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{ft("supplierTimeoutHint")}</p>
      </div>
      <div className="md:col-span-3">
        <div className="flex flex-col items-start justify-center">
          <label className="text-xs font-bold text-foreground">{ft("preferredAirlinesLabel")}</label>
          <p className="mb-1 text-[11px] text-muted-foreground">{ft("preferredAirlinesHint")}</p>
        </div>
      </div>
      <div className="md:col-span-3">
        <PreferredAirlinesCombobox selected={preferredCarrierIatas} onChange={setPreferredCarrierIatas} />
      </div>
    </div>
  );

  const getSliceTimeButtonSummary = (slot: {
    takeoffFrom: string;
    takeoffTo: string;
    landingFrom: string;
    landingTo: string;
  }) => {
    const { takeoffFrom: df, takeoffTo: dt, landingFrom: af, landingTo: at } = slot;
    const empty = (s: string) => !s?.trim();
    if (empty(df) && empty(dt) && empty(af) && empty(at)) return ft("flightTimeSummaryAny");
    const parts: string[] = [];
    if (df && dt) parts.push(ft("flightTimeSummaryTakeoff", { from: df, to: dt }));
    if (af && at) parts.push(ft("flightTimeSummaryLanding", { from: af, to: at }));
    return parts.join(" · ");
  };

  const getMobileOverlayTitle = (key: string | null) => {
    const parsed = parseMobileFieldKey(key);
    if (!parsed) return "";
    switch (parsed.type) {
      case "from":
        return ft("flyingFromLabel");
      case "to":
        return ft("destinationToLabel");
      case "depart":
        return ft("departDateLabel");
      case "return":
        return ft("returnDateLabel");
      case "travelers":
        return getTravelerText();
      case "advanced":
        return ft("advancedOptions");
      case "departTime":
      case "returnTime":
        return ft("flightTime");
      default:
        return "";
    }
  };

  const renderMobilePanelBody = () => {
    const parsed = parseMobileFieldKey(activeField);
    if (!parsed) return null;

    switch (parsed.type) {
      case "from":
        return renderAirportPanelBody(true, parsed.flightId);
      case "to":
        return renderAirportPanelBody(false, parsed.flightId);
      case "depart":
        return renderCalendarPanelContent(false, parsed.flightId);
      case "return":
        return renderCalendarPanelContent(true, null);
      case "travelers":
        return renderTravelerPanelBody();
      case "advanced":
        return renderAdvancedPanelBody();
      case "departTime":
        return (
          <FlightSliceTimePopover
            takeoffFrom={s0DepFrom}
            takeoffTo={s0DepTo}
            landingFrom={s0ArrFrom}
            landingTo={s0ArrTo}
            onConfirm={(next) => {
              setS0DepFrom(next.takeoffFrom);
              setS0DepTo(next.takeoffTo);
              setS0ArrFrom(next.landingFrom);
              setS0ArrTo(next.landingTo);
            }}
            onClose={closeAllPanels}
          />
        );
      case "returnTime":
        return (
          <FlightSliceTimePopover
            takeoffFrom={s1DepFrom}
            takeoffTo={s1DepTo}
            landingFrom={s1ArrFrom}
            landingTo={s1ArrTo}
            onConfirm={(next) => {
              setS1DepFrom(next.takeoffFrom);
              setS1DepTo(next.takeoffTo);
              setS1ArrFrom(next.landingFrom);
              setS1ArrTo(next.landingTo);
            }}
            onClose={closeAllPanels}
          />
        );
      default:
        return null;
    }
  };

  const renderMobileHeaderSlot = () => {
    const parsed = parseMobileFieldKey(activeField);
    if (!parsed) return null;
    if (parsed.type === "from") return renderAirportSearchInput(true, parsed.flightId);
    if (parsed.type === "to") return renderAirportSearchInput(false, parsed.flightId);
    return null;
  };

  const SLICE_TIME_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 px-3 text-sm font-medium text-primary transition hover:bg-primary/15";

  const renderSliceTimeControl = (
    which: "departTime" | "returnTime",
    value: {
      takeoffFrom: string;
      takeoffTo: string;
      landingFrom: string;
      landingTo: string;
    },
    onChange: (next: {
      takeoffFrom: string;
      takeoffTo: string;
      landingFrom: string;
      landingTo: string;
    }) => void,
    onOpenChange: ((open: boolean) => void) | undefined,
    triggerRef: React.RefObject<FlightSliceTimePopoverTriggerHandle | null>,
  ) => {
    if (isMobile) {
      return (
        <button
          type="button"
          onClick={() => openField(which)}
          className={SLICE_TIME_BUTTON_CLASS}
        >
          <span className="truncate">{getSliceTimeButtonSummary(value)}</span>
          <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
        </button>
      );
    }
    return (
      <FlightSliceTimePopoverTrigger
        ref={triggerRef}
        value={value}
        onChange={onChange}
        onOpenChange={onOpenChange}
      />
    );
  };

  // Render City Input with Search functionality (parity with HotelsTab: skeleton, keyboard, highlight)
  const renderCityInput = (type, flight = null) => {
    const isFrom = type === "from";
    const flightId = flight?.id ?? null;
    const fieldKey = airportFieldKey(isFrom ? "from" : "to", flightId);
    const isThisAirportFieldOpen = activeAirportPanelKey === fieldKey;
    const showDropdown =
      (isFrom ? showFromDropdown : showToDropdown) && isThisAirportFieldOpen;
    const search = isFrom ? fromSearch : toSearch;
    const setSearch = isFrom ? setFromSearch : setToSearch;
    const searchInputRef = isFrom ? fromSearchInputRef : toSearchInputRef;
    const selectedAirport = flight ? (isFrom ? flight.from : flight.to) : isFrom ? selectedFromAirport : selectedToAirport;
    const listItems = isFrom ? fromListItems : toListItems;
    const loading = isFrom ? fromAirportLoading : toAirportLoading;
    const highlightIndex = isFrom ? fromHighlightIndex : toHighlightIndex;
    const setHighlightIndex = isFrom ? setFromHighlightIndex : setToHighlightIndex;
    const showInlineInput = showDropdown && !isMobile;

    const displayText = flight
      ? isFrom
        ? getFromDisplayText(flight)
        : getToDisplayText(flight)
      : isFrom
        ? getFromDisplayText()
        : getToDisplayText();

    const label = isFrom ? ft("flyingFromLabel") : ft("destinationToLabel");

    return (
      <div
        className="relative flex-1"
        data-flight-airport-field={fieldKey}
        ref={isFrom ? fromDropdownRef : toDropdownRef}
      >
        {/* Main Input Field - Shows search input when dropdown is open */}
        <div className="relative">
          {showInlineInput ? (
            renderAirportSearchInput(isFrom, flightId)
          ) : (
            <div
              className={COMBO_TRIGGER_CLASS}
              onClick={() => openAirportField(isFrom ? "from" : "to", flightId)}
            >
              <span className={selectedAirport ? "text-foreground font-semibold" : "text-muted-foreground"}>
                {displayText}
              </span>
              <ChevronDown className="w-4 h-4 text-primary dark:text-white" strokeWidth={2} />
            </div>
          )}
          <label className="absolute left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
            {label}
          </label>
        </div>

        {showInlinePanel(showDropdown) ? (
          <div className="absolute left-0 right-0 border border-input rounded bg-card shadow-lg z-[500] max-h-80 dropdown-scrollbar">
            {renderAirportPanelBody(isFrom, flightId)}
          </div>
        ) : null}
      </div>
    );
  };

  // Render additional flight segment (with cross button)
  const renderAdditionalFlight = (flight, index) => (
    <div key={flight.id} className="relative w-full min-w-0">
      <div
        className={cn(
          "grid w-full min-w-0 gap-2",
          isModal ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-12" : "grid-cols-1 md:grid-cols-12 md:items-stretch",
        )}
      >
        {/* From / swap / to — 5 cols on desktop (matches first row) */}
        <div
          className={cn(
            "relative flex min-w-0 flex-col gap-2 md:flex-row",
            isModal ? "sm:col-span-2 md:col-span-8" : "md:col-span-8",
          )}
        >
          {renderCityInput("from", flight)}
          <button
            type="button"
            onClick={() => swapAirports(flight.id)}
            className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card shadow-md transition-all duration-200 hover:bg-muted hover:shadow-lg active:scale-95"
            title={ft("swapDestinationsTitle")}
            disabled={!flight.from || !flight.to}
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 text-muted-foreground md:rotate-0" strokeWidth={2} />
          </button>
          {renderCityInput("to", flight)}
        </div>

        {/* Depart date — 2 cols on desktop */}
        <div
          className={cn(
            "relative min-w-0",
            isModal ? "sm:col-span-1 md:col-span-3" : "md:col-span-3",
          )}
          ref={departDatePickerRef}
          data-flight-date-panel={dateFieldKey(false, flight.id)}
        >
          <div className="relative">
            <div className={COMBO_TRIGGER_CLASS} onClick={() => openDateField(false, flight.id)}>
              <span className={flight.date ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {formatDate(flight.date)}
              </span>
              <Calendar
                className="pointer-events-none h-5 w-5 text-muted-foreground dark:text-white"
                strokeWidth={2}
              />
            </div>
            <label className="pointer-events-none absolute left-4 top-2 text-xs font-bold text-muted-foreground">
              {ft("departDateLabel")}
            </label>
            {showInlinePanel(
              showDepartDatePicker && activeDatePanelKey === dateFieldKey(false, flight.id),
            ) ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full min-w-[320px] rounded-lg border border-input bg-background p-4 shadow-lg">
                {renderCalendarPanelContent(false, flight.id)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Remove — remaining 5 cols on desktop (5 + 2 + 5 = 12) */}
        <div
          className={cn(
            "flex items-center ",
            isModal ? cn("sm:col-span-1 lg:col-span-1 lg:justify-end") : "md:col-span-1",
          )}
        >
          <button
            type="button"
            onClick={() => removeFlight(flight.id)}
            className="flex h-full w-full items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive py-4 border border-border"
            title={ft("removeFlightTitle")}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("mx-auto max-w-7xl", isModal && "mx-0 w-full max-w-none")}>
      {changeSearchError ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {changeSearchError}
        </p>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto">
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-6 pb-5 sm:pb-0">
            {!isChange
              ? tripTypeOptions.map((type) => (
              <label
                key={type.id}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 sm:flex-none sm:justify-start"
              >
                <input
                  type="radio"
                  name="trip-type"
                  checked={tripType === type.id}
                  onChange={() => setTripType(type.id)}
                  className="h-4 w-4 text-primary"
                />
                <span className="whitespace-nowrap text-sm font-bold text-muted-foreground">{type.label}</span>
              </label>
              ))
              : null}
          </div>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <div className="relative w-full max-w-sm" ref={advancedDropdownRef}>
          <div className="relative">
            <div
              className={COMBO_TRIGGER_CLASS}
              style={{ height: "30px" }}
              onClick={openAdvancedField}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary dark:text-white" strokeWidth={2} />
                <span className="text-muted-foreground">{ft("advancedOptions")}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-primary dark:text-white transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </div>
          </div>

          {showInlinePanel(showAdvanced) ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded border border-input bg-card p-4 shadow-lg">
              {renderAdvancedPanelBody()}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid pb-4",
          isModal ? "grid-cols-1 gap-3  lg:gap-2" : "grid-cols-1 gap-2 md:grid-cols-12",
        )}
      >
        {tripType === "multi-city" ? (
          <div
            className={cn(
              "col-span-full flex w-full min-w-0 flex-col gap-3",
              isModal
                ? "sm:col-span-2 md:grid md:col-span-2 md:grid-cols-12 md:items-stretch md:gap-2"
                : "md:col-span-12 md:grid md:grid-cols-12 md:items-stretch md:gap-2",
            )}
          >
            <div
              className={cn(
                "relative order-1 flex min-w-0 flex-col gap-2 md:flex-row",
                isModal ? "md:col-span-5 md:row-start-1" : "md:col-span-5 md:row-start-1",
              )}
            >
              {renderCityInput("from", flights[0])}
              <button
                onClick={() => swapAirports(flights[0].id)}
                className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card shadow-md transition-all duration-200 hover:bg-muted hover:shadow-lg active:scale-95"
                title={ft("swapDestinationsTitle")}
                disabled={!flights[0].from || !flights[0].to}
              >
                <ArrowLeftRight className="h-4 w-4 rotate-90 text-muted-foreground md:rotate-0" strokeWidth={2} />
              </button>
              {renderCityInput("to", flights[0])}
            </div>

            <div
              className={cn(
                "relative order-2 min-w-0",
                isModal ? "md:col-span-2 md:row-start-1" : "md:col-span-2 md:row-start-1",
              )}
              ref={departDatePickerRef}
              data-flight-date-panel={dateFieldKey(false, flights[0].id)}
            >
              <div className="relative">
                <div className={COMBO_TRIGGER_CLASS} onClick={() => openDateField(false, flights[0].id)}>
                  <span
                    className={
                      flights[0].date ? "font-semibold text-foreground" : "text-muted-foreground"
                    }
                  >
                    {formatDate(flights[0].date)}
                  </span>
                  <Calendar
                    className="pointer-events-none h-5 w-5 text-muted-foreground dark:text-white"
                    strokeWidth={2}
                  />
                </div>
                <label className="pointer-events-none absolute left-4 top-2 text-xs font-bold text-muted-foreground">
                  {ft("departDateLabel")}
                </label>
                {showInlinePanel(
                  showDepartDatePicker &&
                    activeDatePanelKey === dateFieldKey(false, flights[0].id),
                ) ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full min-w-[320px] rounded-lg border border-input bg-background p-4 shadow-lg">
                    {renderCalendarPanelContent(false, flights[0].id)}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={cn(
                "relative order-3 min-w-0",
                isModal ? "md:col-span-4 md:row-start-1" : "md:col-span-4 md:row-start-1",
              )}
              ref={travelerDropdownRef}
            >
              <div className="relative">
                <div
                  className={cn(COMBO_TRIGGER_CLASS, isChange && "cursor-default opacity-90")}
                  onClick={openTravelersField}
                  aria-readonly={isChange || undefined}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary dark:text-white" strokeWidth={2} />
                    <span className="text-muted-foreground">{getTravelerText()}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-primary transition-transform dark:text-white ${showTravelerDropdown ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </div>
                {showInlinePanel(showTravelerDropdown) ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full rounded border border-input bg-card p-4 shadow-lg">
                    {renderTravelerPanelBody()}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Additional flights — mobile order 4; desktop full-width row 2 */}
            <div
              className={cn(
                "order-4 w-full min-w-0 space-y-3",
                isModal ? "md:col-span-12 md:row-start-2" : "md:col-span-12 md:row-start-2",
              )}
            >
              {flights.slice(1).map((flight, index) => renderAdditionalFlight(flight, index + 1))}
            </div>

            {/* Add flight — mobile order 5 (before search); desktop row 3, right-aligned */}
            <div
              className={cn(
                "order-5 flex w-full min-w-0",
                isModal
                  ? "md:col-span-12 md:row-start-3 md:justify-end"
                  : "md:col-span-12 md:row-start-3 md:justify-end",
              )}
            >
              <button
                type="button"
                onClick={addFlight}
                className="flex w-full flex-row items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input py-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary sm:text-base md:w-auto md:min-w-[13rem] md:max-w-xs md:px-8"
              >
                <Plus className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="whitespace-nowrap">{ft("addAnotherFlight")}</span>
              </button>
            </div>

            {/* Search — mobile order 6 (last); desktop row 1 col 12 (5+2+4+1) */}
            <div
              className={cn(
                "order-6 flex items-stretch",
                isModal
                  ? "md:col-span-1 md:col-start-12 md:row-start-1"
                  : "md:col-span-1 md:col-start-12 md:row-start-1",
              )}
            >
              <button
                type="button"
                onClick={onSearchNavigate}
                disabled={changeSearchBusy}
                className="flex h-16 w-full items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50 md:h-full md:min-h-16"
                aria-label={ft("searchFlightsAria")}
              >
                <Search className="h-6 w-6" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          /* One Way & Round Trip Layout (unchanged) */
          <>
            {/* Container for both location fields and swap button - 5 columns */}
            <div
              className={cn(
                "relative flex gap-2 flex-col md:flex-row",
                isModal ? cn("sm:col-span-2", MODAL_LG_GRID.locations) : "md:col-span-5",
              )}
            >
              {/* Flying From */}
              {renderCityInput('from')}

              {/* Swap Button */}
              <button
                onClick={() => swapAirports()}
                className="absolute left-1/2 sm:top-[18px] top-[50px] -translate-x-1/2 z-10 w-8 h-8 bg-card border border-input rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:bg-muted active:scale-95"
                title={ft("swapDestinationsTitle")}
                disabled={!selectedFromAirport || !selectedToAirport}
              >
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground rotate-90 sm:rotate-0" strokeWidth={2} />
              </button>

              {/* Destination To */}
              {renderCityInput('to')}
            </div>

            {/* Departure date + flight time (Duffel-style) */}
            <div
              className={cn("relative", isModal ? "sm:col-span-1 lg:col-span-6" : "md:col-span-2")}
              ref={departDatePickerRef}
              data-flight-date-panel={dateFieldKey(false, null)}
            >
              <div className="relative ">
                <label className="absolute left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
                  {ft("departureDateLabel")}
                </label>
                <div
                  className={COMBO_TRIGGER_CLASS}
                  onClick={() => openDateField(false, null)}
                >
                  <div className="min-w-0 flex-1">{formatDateSegmentsDisplay(departDate)}</div>
                  <Calendar className="h-5 w-5 shrink-0 text-muted-foreground pointer-events-none dark:text-white" strokeWidth={2} />
                </div>
                {showInlinePanel(
                  showDepartDatePicker && activeDatePanelKey === dateFieldKey(false, null),
                ) ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[320px] w-full rounded-lg border border-input bg-background p-4 shadow-lg">
                    {renderCalendarPanelContent(false, null)}
                  </div>
                ) : null}
              </div>
              {renderSliceTimeControl(
                "departTime",
                {
                  takeoffFrom: s0DepFrom,
                  takeoffTo: s0DepTo,
                  landingFrom: s0ArrFrom,
                  landingTo: s0ArrTo,
                },
                (next) => {
                  setS0DepFrom(next.takeoffFrom);
                  setS0DepTo(next.takeoffTo);
                  setS0ArrFrom(next.landingFrom);
                  setS0ArrTo(next.landingTo);
                },
                (o) => {
                  if (o) {
                    setShowDepartDatePicker(false);
                    setActiveDatePanelKey(null);
                  }
                },
                departTimeTriggerRef,
              )}
            </div>

            {/* Return date + flight time (round-trip) */}
            {tripType === "round-trip" ? (
              <div
                className={cn("relative", isModal ? cn("sm:col-span-1", MODAL_LG_GRID.date) : "md:col-span-2")}
                ref={returnDatePickerRef}
                data-flight-date-panel={dateFieldKey(true, null)}
              >
                <div className="relative">
                  <label className="pointer-events-none absolute left-4 top-2 text-xs font-bold text-muted-foreground">
                    {ft("returnDateLabel")}
                  </label>
                  <div
                    className={COMBO_TRIGGER_CLASS}
                    onClick={() => openDateField(true, null)}
                  >
                    <div className="min-w-0 flex-1">{formatDateSegmentsDisplay(returnDate)}</div>
                    <Calendar className="h-5 w-5 shrink-0 text-muted-foreground pointer-events-none dark:text-white" strokeWidth={2} />
                  </div>
                  {showInlinePanel(
                    showReturnDatePicker && activeDatePanelKey === dateFieldKey(true, null),
                  ) ? (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[320px] w-full rounded-lg border border-input bg-background p-4 shadow-lg">
                      {renderCalendarPanelContent(true, null)}
                    </div>
                  ) : null}
                </div>
                {renderSliceTimeControl(
                  "returnTime",
                  {
                    takeoffFrom: s1DepFrom,
                    takeoffTo: s1DepTo,
                    landingFrom: s1ArrFrom,
                    landingTo: s1ArrTo,
                  },
                  (next) => {
                    setS1DepFrom(next.takeoffFrom);
                    setS1DepTo(next.takeoffTo);
                    setS1ArrFrom(next.landingFrom);
                    setS1ArrTo(next.landingTo);
                  },
                  (o) => {
                    if (o) {
                      setShowReturnDatePicker(false);
                      setActiveDatePanelKey(null);
                    }
                  },
                  returnTimeTriggerRef,
                )}
              </div>
            ) : null}

            {/* Travellers - Dynamic columns based on trip type */}
            <div
              className={cn(
                "relative",
                tripType === "round-trip" ? "md:col-span-2" : "md:col-span-4",
                isModal && tripType === "round-trip" && MODAL_LG_GRID.travellersRoundTrip,
                isModal && tripType !== "round-trip" && MODAL_LG_GRID.travellersOneWayMulti,
              )}
              ref={travelerDropdownRef}
            >
              <div className="relative">
                <div
                  className={cn(COMBO_TRIGGER_CLASS, isChange && "cursor-default opacity-90")}
                  onClick={openTravelersField}
                  aria-readonly={isChange || undefined}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary dark:text-white" strokeWidth={2} />
                    <span className="text-muted-foreground">{getTravelerText()}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-primary dark:text-white transition-transform ${showTravelerDropdown ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </div>

                {/* Traveler Counter Dropdown - Fixed positioning */}
                {showInlinePanel(showTravelerDropdown) ? (
                  <div className="absolute top-full left-0 right-0 mt-1 p-4 border border-input rounded bg-card shadow-lg z-50 w-full">
                    {renderTravelerPanelBody()}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Search Button - Always 1 column */}
            <div
              className={cn(
                "flex items-start justify-center md:col-span-1",
                isModal && tripType === "round-trip" && MODAL_LG_GRID.searchRoundTrip,
                isModal && tripType !== "round-trip" && MODAL_LG_GRID.searchOneWayMulti,
              )}
            >
              <button
                type="button"
                onClick={onSearchNavigate}
                disabled={changeSearchBusy}
                className="w-full  py-3 sm:py-5 px-6 bg-primary hover:bg-primary-600 text-white rounded-lg flex items-center justify-center transition-colors font-semibold disabled:opacity-50"
                aria-label={ft("searchFlightsAria")}
              >
                <Search className="w-6 h-6" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </>
        )}
      </div>

      <MobileFullscreenSearchOverlay
        open={!!activeField}
        onClose={closeAllPanels}
        title={getMobileOverlayTitle(activeField)}
        headerSlot={renderMobileHeaderSlot()}
        closeAriaLabel={tCommon("close")}
      >
        {renderMobilePanelBody()}
      </MobileFullscreenSearchOverlay>
    </div>
  );
}

export default FlightsTab;