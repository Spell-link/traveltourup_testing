// @ts-nocheck - Complex hero tab; autocomplete typed incrementally with FlightsTab parity
"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { HotelsPageLayout } from "@/lib/hotels/hotels-page-layout";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, Building2, Search } from "lucide-react";
import { DESTINATIONS, type HotelDestination } from "@/data/destinations";
import { coordsForDestinationCode } from "@/data/stay-destination-coords";
import {
  postStaysSearch,
  TTU_STAYS_SEARCH_SESSION_KEY,
  TTU_STAYS_SEARCH_PENDING_KEY,
  TTU_STAYS_SEARCH_STARTED_EVENT,
  TTU_STAYS_SEARCH_UPDATED_EVENT,
} from "@/lib/http/stays.client";
import { COMBO_FIELD_SHELL_CLASS, COMBO_FIELD_SHELL_RESPONSIVE_CLASS } from "@/components/ui/inputFieldStyles";
import { useDuffelHotelLocationSuggest } from "@/components/hotels/useDuffelHotelLocationSuggest";
import { Skeleton } from "@/components/admin_ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { getRegionSelectOptions } from "@/lib/region-select-options";
import { SearchableSelectCombobox } from "@/components/ui/SearchableSelectCombobox";
import { MobileFullscreenSearchOverlay } from "@/components/shared/mobile/MobileFullscreenSearchOverlay";
import { useMobileFullscreenInteraction } from "@/hooks/useMobileFullscreenInteraction";

const HOTEL_COMBO_TRIGGER = `${COMBO_FIELD_SHELL_CLASS} cursor-pointer flex justify-between items-center font-medium`;
const HOTEL_COMBO_TRIGGER_SM = `${COMBO_FIELD_SHELL_RESPONSIVE_CLASS} cursor-pointer flex justify-between items-center font-medium`;

const POPULAR_HOTEL_DESTINATIONS: HotelDestination[] = DESTINATIONS.slice(0, 10);

/** YYYY-MM-DD in local time (avoids UTC shift from toISOString on calendar picks). */
function toLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDayFromParts(year, monthIndex, day) {
  const dt = new Date(year, monthIndex, day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export type SelectedHotelLocation =
  | {
      kind: "popular";
      code: string;
      name: string;
      country: string;
    }
  | {
      kind: "place";
      id: string;
      name: string;
      city_name?: string;
      iata_code: string;
      latitude: number;
      longitude: number;
      radius: number;
    };

function HotelsTab({
  layout = "browse",
  mode = false,
  /** Close host chrome (e.g. edit-search dialog + mobile filters) before navigation/API. */
  onStaysSearchStart,
}: {
  layout?: HotelsPageLayout;
  mode?: boolean;
  onStaysSearchStart?: () => void;
} = {}) {
  const router = useRouter();
  const locale = useLocale();
  const ht = useTranslations("Hotels.tab");
  const tCommon = useTranslations("Common");
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [nationality, setNationality] = useState("US");
  const nationalityOptions = useMemo(() => getRegionSelectOptions(locale), [locale]);
  const nationalitySelectOptions = useMemo(
    () => nationalityOptions.map((o) => ({ value: o.code, label: o.label })),
    [nationalityOptions],
  );
  useEffect(() => {
    if (nationalityOptions.length === 0) return;
    if (!nationalityOptions.some((o) => o.code === nationality)) {
      setNationality(nationalityOptions.find((o) => o.code === "US")?.code ?? nationalityOptions[0].code);
    }
  }, [nationalityOptions, nationality]);
  const [showRoomsDropdown, setShowRoomsDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<SelectedHotelLocation | null>(null);
  const [destinationHighlightIndex, setDestinationHighlightIndex] = useState(-1);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const checkInPickerRef = useRef(null);
  const checkOutPickerRef = useRef(null);
  const roomsDropdownRef = useRef(null);
  const destinationDropdownRef = useRef(null);
  const destinationSearchInputRef = useRef<HTMLInputElement | null>(null);

  const { rows: hotelLocationApiRows, loading: hotelLocationLoading } = useDuffelHotelLocationSuggest(
    showDestinationDropdown,
    destinationSearch,
  );

  const destinationListItems = useMemo(() => {
    const trimmed = destinationSearch.trim();
    if (trimmed.length < 2) {
      return POPULAR_HOTEL_DESTINATIONS.map((d) => ({ kind: "popular" as const, d }));
    }
    return hotelLocationApiRows.map((r) => ({ kind: "place" as const, r }));
  }, [destinationSearch, hotelLocationApiRows]);

  const {
    isMobile,
    activeField,
    openField,
    closeField,
    showInlinePanel,
  } = useMobileFullscreenInteraction();

  const closeAllPanels = useCallback(() => {
    setShowCheckInPicker(false);
    setShowCheckOutPicker(false);
    setShowRoomsDropdown(false);
    setShowDestinationDropdown(false);
    setDestinationSearch("");
    setDestinationHighlightIndex(-1);
    closeField();
  }, [closeField]);

  const openDestinationField = useCallback(() => {
    if (isMobile) {
      openField("destination");
      setShowDestinationDropdown(true);
      setDestinationSearch("");
    } else {
      setShowDestinationDropdown(true);
      setDestinationSearch("");
    }
  }, [isMobile, openField]);

  const openDateField = useCallback(
    (isCheckOut: boolean) => {
      if (isMobile) {
        openField(isCheckOut ? "checkOut" : "checkIn");
        if (isCheckOut) setShowCheckOutPicker(true);
        else setShowCheckInPicker(true);
      } else if (isCheckOut) {
        setShowCheckOutPicker((v) => !v);
      } else {
        setShowCheckInPicker((v) => !v);
      }
    },
    [isMobile, openField],
  );

  const openGuestsField = useCallback(() => {
    if (isMobile) {
      openField("guests");
      setShowRoomsDropdown(true);
    } else {
      setShowRoomsDropdown((v) => !v);
    }
  }, [isMobile, openField]);

  useEffect(() => {
    setDestinationHighlightIndex(-1);
  }, [destinationSearch, hotelLocationApiRows, showDestinationDropdown]);

  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event) => {
      if (
        checkInPickerRef.current &&
        !checkInPickerRef.current.contains(event.target)
      ) {
        setShowCheckInPicker(false);
      }
      if (
        checkOutPickerRef.current &&
        !checkOutPickerRef.current.contains(event.target)
      ) {
        setShowCheckOutPicker(false);
      }
      if (
        roomsDropdownRef.current &&
        !roomsDropdownRef.current.contains(event.target)
      ) {
        setShowRoomsDropdown(false);
      }
      if (
        destinationDropdownRef.current &&
        !destinationDropdownRef.current.contains(event.target)
      ) {
        setShowDestinationDropdown(false);
        setDestinationSearch("");
        setDestinationHighlightIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile]);

  // Close all dropdowns on Escape key (Phase 5 - Accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isMobile && activeField) {
        closeAllPanels();
        return;
      }
      setShowCheckInPicker(false);
      setShowCheckOutPicker(false);
      setShowRoomsDropdown(false);
      setShowDestinationDropdown(false);
      setDestinationSearch("");
      setDestinationHighlightIndex(-1);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeField, closeAllPanels, isMobile]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showDestinationDropdown && destinationSearchInputRef.current) {
      setTimeout(() => {
        destinationSearchInputRef.current?.focus();
      }, 100);
    }
  }, [showDestinationDropdown]);

  const shouldHydrateFromSession = layout === "results" || mode;

  const applyStaysFormFromSession = useCallback(() => {
    if (!shouldHydrateFromSession) return;
    const snap = readStaysSearchFormSnapshot();
    if (!snap) return;
    setCheckInDate(snap.check_in_date);
    setCheckOutDate(snap.check_out_date);
    setRooms(snap.rooms);
    setAdults(snap.adults);
    setChildren(snap.children);
    if (snap.destination) {
      setSelectedDestination(snap.destination);
    }
    const [iy, im] = snap.check_in_date.split("-").map((x) => parseInt(x, 10));
    if (!Number.isNaN(iy) && !Number.isNaN(im)) {
      setCurrentMonth(im - 1);
      setCurrentYear(iy);
    }
  }, [shouldHydrateFromSession]);

  useLayoutEffect(() => {
    applyStaysFormFromSession();
  }, [applyStaysFormFromSession]);

  useEffect(() => {
    if (!shouldHydrateFromSession) return;
    const onSessionUpdated = () => applyStaysFormFromSession();
    window.addEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, onSessionUpdated);
    return () => window.removeEventListener(TTU_STAYS_SEARCH_UPDATED_EVENT, onSessionUpdated);
  }, [shouldHydrateFromSession, applyStaysFormFromSession]);

  const handleStaysSearch = async () => {
    if (!selectedDestination) {
      window.alert(ht("alertSelectDestination"));
      return;
    }
    if (!checkInDate || !checkOutDate) {
      window.alert(ht("alertSelectDates"));
      return;
    }
    let coords: { latitude: number; longitude: number; radius: number } | null = null;
    if (selectedDestination.kind === "popular") {
      coords = coordsForDestinationCode(selectedDestination.code);
      if (!coords) {
        window.alert(ht("alertDestinationUnavailable"));
        return;
      }
    } else {
      coords = {
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
        radius: selectedDestination.radius,
      };
    }
    onStaysSearchStart?.();
    const guests = [];
    for (let i = 0; i < adults; i++) guests.push({ type: "adult" });
    for (let i = 0; i < children; i++) guests.push({ type: "child", age: 8 });

    sessionStorage.setItem(TTU_STAYS_SEARCH_PENDING_KEY, "1");
    sessionStorage.removeItem(TTU_STAYS_SEARCH_SESSION_KEY);
    window.dispatchEvent(new Event(TTU_STAYS_SEARCH_STARTED_EVENT));
    router.push("/hotels?stays_results=1");

    try {
      const data = await postStaysSearch({
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        rooms,
        guests,
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius: coords.radius,
        },
      });
      const destinationSnapshot =
        selectedDestination.kind === "popular"
          ? {
              kind: "popular" as const,
              code: selectedDestination.code,
              name: selectedDestination.name,
              country: selectedDestination.country,
            }
          : {
              kind: "place" as const,
              id: selectedDestination.id,
              name: selectedDestination.name,
              city_name: selectedDestination.city_name,
              iata_code: selectedDestination.iata_code,
              latitude: selectedDestination.latitude,
              longitude: selectedDestination.longitude,
              radius: selectedDestination.radius,
            };
      sessionStorage.setItem(
        TTU_STAYS_SEARCH_SESSION_KEY,
        JSON.stringify({
          context: {
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            rooms,
            adults,
            children,
            destination: destinationSnapshot,
          },
          ...data,
        }),
      );
      sessionStorage.removeItem(TTU_STAYS_SEARCH_PENDING_KEY);
      window.dispatchEvent(new Event(TTU_STAYS_SEARCH_UPDATED_EVENT));
    } catch (e) {
      sessionStorage.removeItem(TTU_STAYS_SEARCH_PENDING_KEY);
      sessionStorage.removeItem(TTU_STAYS_SEARCH_SESSION_KEY);
      window.dispatchEvent(new Event(TTU_STAYS_SEARCH_UPDATED_EVENT));
      const msg = e instanceof Error ? e.message : ht("searchFailed");
      window.alert(msg);
    }
  };

  const updateRooms = (action) => {
    setRooms(action === "increment" ? rooms + 1 : Math.max(1, rooms - 1));
  };

  const updateAdults = (action) => {
    setAdults(action === "increment" ? adults + 1 : Math.max(1, adults - 1));
  };

  const updateChildren = (action) => {
    setChildren(
      action === "increment" ? children + 1 : Math.max(0, children - 1)
    );
  };

  const getTravelerText = () => {
    const roomsWord = rooms > 1 ? ht("roomsPlural") : ht("roomSingular");
    const travelersWord =
      adults + children > 1 ? ht("travelersPlural") : ht("travelerSingular");
    return `${rooms} ${roomsWord}, ${adults + children} ${travelersWord}`;
  };

  const getDestinationDisplayText = () => {
    if (!selectedDestination) return ht("selectDestination");
    if (selectedDestination.kind === "popular") {
      return `${selectedDestination.name}, ${selectedDestination.country}`;
    }
    const city = selectedDestination.city_name || selectedDestination.name;
    return `${city} (${selectedDestination.iata_code})`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return ht("selectDate");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const selectDestinationListItem = useCallback(
    (index: number) => {
      const row = destinationListItems[index];
      if (!row) return;
      if (row.kind === "popular") {
        const destination = row.d;
        setSelectedDestination({
          kind: "popular",
          code: destination.code,
          name: destination.name,
          country: destination.country,
        });
      } else {
        const r = row.r;
        setSelectedDestination({
          kind: "place",
          id: r.id,
          name: r.name,
          city_name: r.city_name,
          iata_code: r.iata_code,
          latitude: r.latitude,
          longitude: r.longitude,
          radius: 15,
        });
      }
      closeAllPanels();
    },
    [closeAllPanels, destinationListItems],
  );

  const handleDestinationSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDestinationDropdown) return;
    if (hotelLocationLoading && destinationSearch.trim().length >= 2) return;

    const len = destinationListItems.length;
    if (len === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestinationHighlightIndex((i) => (i + 1 >= len ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestinationHighlightIndex((i) => (i <= 0 ? len - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (destinationHighlightIndex >= 0 && destinationHighlightIndex < len) {
        e.preventDefault();
        selectDestinationListItem(destinationHighlightIndex);
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
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const handleDateSelect = (
    day,
    month,
    year,
    setDateFunction,
    setShowPickerFunction,
    isCheckOut
  ) => {
    const selectedDate = new Date(year, month, day);
    const formattedDate = toLocalYmd(selectedDate);
    setDateFunction(formattedDate);
    if (!isCheckOut) {
      setCheckOutDate((prev) => (prev && prev < formattedDate ? formattedDate : prev));
    }
    setShowPickerFunction(false);
    closeField();
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const renderCalendar = (
    selectedDate,
    setDateFunction,
    setShowPickerFunction,
    isCheckOut = false
  ) => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minSelectable = today;
    if (isCheckOut && checkInDate) {
      const [y, m, d] = checkInDate.split("-").map(Number);
      const checkInStart = startOfLocalDayFromParts(y, m - 1, d);
      minSelectable = checkInStart > today ? checkInStart : today;
    }

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const cellStart = startOfLocalDayFromParts(currentYear, currentMonth, day);
      const isToday = cellStart.getTime() === today.getTime();
      const isSelected =
        selectedDate && toLocalYmd(currentDate) === selectedDate;
      const disabled = cellStart < minSelectable;

      days.push(
        <button
          key={day}
          type="button"
          disabled={disabled}
          onClick={() =>
            handleDateSelect(
              day,
              currentMonth,
              currentYear,
              setDateFunction,
              setShowPickerFunction,
              isCheckOut
            )
          }
          className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
            disabled
              ? "cursor-not-allowed text-muted-foreground/40 opacity-40"
              : isSelected
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary-600"
                : isToday
                  ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                  : "text-foreground hover:bg-muted hover:border hover:border-border"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderDestinationSearchInput = () => (
    <div className="w-full px-4 py-3 border border-input rounded-lg text-sm bg-card">
      <input
        ref={destinationSearchInputRef}
        type="text"
        placeholder={ht("destinationPlaceholder")}
        value={destinationSearch}
        onChange={(e) => setDestinationSearch(e.target.value)}
        onKeyDown={handleDestinationSearchKeyDown}
        className="w-full bg-transparent border-none outline-none text-foreground font-medium placeholder-muted-foreground"
        autoFocus
      />
    </div>
  );

  const renderDestinationPanelBody = () => (
    <>
      {destinationSearch.trim().length < 2 ? (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
          {ht("popularHint")}
        </div>
      ) : null}
      <div className="py-1" role="listbox" aria-label={ht("destinationsAria")}>
        {hotelLocationLoading && destinationSearch.trim().length >= 2 ? (
          Array.from({ length: 6 }, (_, i) => (
            <div
              key={`sk-${i}`}
              className="px-4 py-3 border-b border-border last:border-b-0"
              aria-hidden
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                </div>
                <Skeleton className="h-7 w-12 shrink-0 rounded" />
              </div>
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          ))
        ) : destinationSearch.trim().length >= 2 && hotelLocationApiRows.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{ht("noMatching")}</div>
        ) : (
          destinationListItems.map((item, index) => {
            if (item.kind === "popular") {
              const destination = item.d;
              return (
                <div
                  key={destination.code}
                  role="option"
                  aria-selected={destinationHighlightIndex === index}
                  className={cn(
                    "px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-b-0",
                    destinationHighlightIndex === index && "bg-primary/10 ring-1 ring-inset ring-primary/20",
                  )}
                  onMouseEnter={() => setDestinationHighlightIndex(index)}
                  onClick={() => selectDestinationListItem(index)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-foreground">{destination.name}</div>
                      <div className="text-xs text-muted-foreground">{destination.country}</div>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {destination.type}
                    </div>
                  </div>
                </div>
              );
            }
            const place = item.r;
            return (
              <div
                key={place.id}
                role="option"
                aria-selected={destinationHighlightIndex === index}
                className={cn(
                  "px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-b-0",
                  destinationHighlightIndex === index && "bg-primary/10 ring-1 ring-inset ring-primary/20",
                )}
                onMouseEnter={() => setDestinationHighlightIndex(index)}
                onClick={() => selectDestinationListItem(index)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-foreground">{place.city_name || place.name}</div>
                    <div className="text-xs text-muted-foreground">{place.name}</div>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {place.iata_code}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{place.iata_country_code ?? ""}</div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const renderDatePanelBody = (isCheckOut: boolean) => {
    const selectedDate = isCheckOut ? checkOutDate : checkInDate;
    const setDate = isCheckOut ? setCheckOutDate : setCheckInDate;
    const setShowPicker = isCheckOut ? setShowCheckOutPicker : setShowCheckInPicker;

    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </button>
          <h3 className="text-lg font-bold text-foreground">
            {formatMonthYear(new Date(currentYear, currentMonth))}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-sm font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {renderCalendar(selectedDate, setDate, setShowPicker, isCheckOut)}
        </div>

        {selectedDate ? (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">Selected Date:</div>
            <div className="text-lg font-semibold text-primary">{formatDate(selectedDate)}</div>
          </div>
        ) : null}
      </>
    );
  };

  const renderGuestPanelBody = () => (
    <>
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <div>
          <span className="text-sm font-bold text-foreground block">{ht("roomsCounterLabel")}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => updateRooms("decrement")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            disabled={rooms <= 1}
          >
            -
          </button>
          <span className="text-sm font-bold w-4 sm:w-6 text-center text-muted-foreground">{rooms}</span>
          <button
            type="button"
            onClick={() => updateRooms("increment")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold text-sm sm:text-base"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <div>
          <span className="text-sm font-bold text-foreground block">{ht("adults")}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => updateAdults("decrement")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            disabled={adults <= 1}
          >
            -
          </button>
          <span className="text-sm font-bold w-4 sm:w-6 text-center text-muted-foreground">{adults}</span>
          <button
            type="button"
            onClick={() => updateAdults("increment")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold text-sm sm:text-base"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <div>
          <span className="text-sm font-bold text-foreground block">{ht("children")}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => updateChildren("decrement")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            disabled={children <= 0}
          >
            -
          </button>
          <span className="text-sm font-bold w-4 sm:w-6 text-center text-muted-foreground">{children}</span>
          <button
            type="button"
            onClick={() => updateChildren("increment")}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold text-sm sm:text-base"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <span className="text-sm font-bold text-foreground shrink-0">{ht("nationality")}</span>
        <SearchableSelectCombobox
          className="shrink-0"
          options={nationalitySelectOptions}
          value={nationality}
          onChange={setNationality}
          searchPlaceholder={ht("nationalityComboPlaceholder")}
          emptyMessage={ht("nationalityComboNoMatches")}
          aria-label={ht("nationality")}
        />
      </div>
    </>
  );

  const getMobileOverlayTitle = (key: string | null) => {
    if (!key) return "";
    switch (key) {
      case "destination":
        return ht("destinationLabel");
      case "checkIn":
        return ht("checkInDateLabel");
      case "checkOut":
        return ht("checkOutDateLabel");
      case "guests":
        return ht("roomsGuestsLabel");
      default:
        return "";
    }
  };

  const renderMobilePanelBody = () => {
    switch (activeField) {
      case "destination":
        return renderDestinationPanelBody();
      case "checkIn":
        return renderDatePanelBody(false);
      case "checkOut":
        return renderDatePanelBody(true);
      case "guests":
        return renderGuestPanelBody();
      default:
        return null;
    }
  };

  const renderMobileHeaderSlot = () => {
    if (activeField === "destination") return renderDestinationSearchInput();
    return null;
  };

  const showInlineDestinationInput = showDestinationDropdown && !isMobile;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-13 gap-3 rounded-lg pb-4 sm:gap-4">
        {/* Destination Dropdown - UPDATED LIKE FLIGHTSTAB */}
        <div className={mode ? "col-span-12 md:col-span-5 relative" : "col-span-12 md:col-span-3 relative"} ref={destinationDropdownRef}>
          <div className="relative">
            {showInlineDestinationInput ? (
              <div className="w-full px-4 py-3 border border-input rounded-lg text-sm bg-card h-16 pt-5">
                <input
                  ref={destinationSearchInputRef}
                  type="text"
                  placeholder={ht("destinationPlaceholder")}
                  value={destinationSearch}
                  onChange={(e) => setDestinationSearch(e.target.value)}
                  onKeyDown={handleDestinationSearchKeyDown}
                  className="w-full h-full bg-transparent border-none outline-none text-foreground font-medium placeholder-muted-foreground"
                  autoFocus
                />
              </div>
            ) : (
              <div className={HOTEL_COMBO_TRIGGER} onClick={openDestinationField}>
                <span className={selectedDestination ? "text-foreground font-semibold" : "text-muted-foreground"}>
                  {getDestinationDisplayText()}
                </span>
                <ChevronDown className="w-4 h-4 text-primary dark:text-white" strokeWidth={2} />
              </div>
            )}
            <label className="absolute left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ht("destinationLabel")}
            </label>
          </div>

          {showInlinePanel(showDestinationDropdown) ? (
            <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded bg-card shadow-lg z-[500] max-h-80 dropdown-scrollbar">
              {renderDestinationPanelBody()}
            </div>
          ) : null}
        </div>

        {/* Check-in Date */}
        <div className={mode ? "col-span-12 md:col-span-4 relative" : "col-span-12 md:col-span-3 relative"} ref={checkInPickerRef}>
          <div className="relative">
            <div className={HOTEL_COMBO_TRIGGER_SM} onClick={() => openDateField(false)}>
              <span
                className={`text-xs sm:text-sm ${checkInDate ? "text-foreground font-semibold" : "text-muted-foreground"} truncate`}
              >
                {formatDate(checkInDate)}
              </span>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground dark:text-white pointer-events-none flex-shrink-0" strokeWidth={2} />
            </div>
            <label className="absolute left-3 sm:left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ht("checkInDateLabel")}
            </label>
          </div>

          {showInlinePanel(showCheckInPicker) ? (
            <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-xl bg-card shadow-xl z-50 p-6 min-w-80">
              {renderDatePanelBody(false)}
            </div>
          ) : null}
        </div>

        {/* Check-out Date */}
        <div className={mode ? "col-span-12 md:col-span-4 relative" : "col-span-12 md:col-span-3 relative"} ref={checkOutPickerRef}>
          <div className="relative">
            <div className={HOTEL_COMBO_TRIGGER_SM} onClick={() => openDateField(true)}>
              <span
                className={`text-xs sm:text-sm ${checkOutDate ? "text-foreground font-semibold" : "text-muted-foreground"} truncate`}
              >
                {formatDate(checkOutDate)}
              </span>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground dark:text-white pointer-events-none flex-shrink-0" strokeWidth={2} />
            </div>
            <label className="absolute left-3 sm:left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ht("checkOutDateLabel")}
            </label>
          </div>

          {showInlinePanel(showCheckOutPicker) ? (
            <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-xl bg-card shadow-xl z-50 p-6 min-w-80">
              {renderDatePanelBody(true)}
            </div>
          ) : null}
        </div>

        {/* Rooms & Guests Dropdown */}
        <div className={mode ? "col-span-12 md:col-span-10 relative" : "col-span-12 md:col-span-3 relative"} ref={roomsDropdownRef}>
          <div className="relative">
            <div className={HOTEL_COMBO_TRIGGER_SM} onClick={openGuestsField}>
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-white flex-shrink-0" strokeWidth={2} />
                <span className="text-xs sm:text-sm truncate text-muted-foreground">{getTravelerText()}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-primary dark:text-white transition-transform flex-shrink-0 ${showRoomsDropdown ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </div>
            <label className="absolute left-3 sm:left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ht("roomsGuestsLabel")}
            </label>

            {showInlinePanel(showRoomsDropdown) ? (
              <div className="absolute top-full left-0 right-0 mt-1 p-3 sm:p-4 border border-input rounded bg-card shadow-lg z-50 w-full min-w-[250px]">
                {renderGuestPanelBody()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Search Button with Icon */}
        <div className={mode ? "col-span-12 md:col-span-3 flex-shrink-0 flex items-end" : "col-span-12 md:col-span-1 flex-shrink-0 flex items-end"}>
          <button
            type="button"
            className="w-full h-14 sm:h-16 bg-primary hover:bg-primary-600 disabled:opacity-60 text-white rounded-lg flex items-center justify-center transition-colors font-semibold md:aspect-square"
            aria-label={ht("searchHotels")}
            disabled={!selectedDestination || !checkInDate || !checkOutDate}
            onClick={() => void handleStaysSearch()}
          >
            <Search className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} aria-hidden />
          </button>
        </div>
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

export default HotelsTab;
