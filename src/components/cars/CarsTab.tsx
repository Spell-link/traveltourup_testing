// @ts-nocheck - Phase 1: Complex component; full typing in Phase 3
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, Users, Search } from "lucide-react";
import { CAR_LOCATIONS } from "@/data/locations";
import { COMBO_FIELD_SHELL_CLASS, COMBO_FIELD_SHELL_RESPONSIVE_CLASS } from "@/components/ui/inputFieldStyles";

const CAR_COMBO_TRIGGER = `${COMBO_FIELD_SHELL_CLASS} cursor-pointer flex justify-between items-center font-medium`;
const CAR_COMBO_TRIGGER_SM = `${COMBO_FIELD_SHELL_RESPONSIVE_CLASS} cursor-pointer flex justify-between items-center font-medium`;

function startOfLocalDayFromParts(year, monthIndex, day) {
  const dt = new Date(year, monthIndex, day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function CarsTab() {
  const ct = useTranslations("Cars.tab");
  const [travelers, setTravelers] = useState({
    adults: 1,
    children: 0,
  });
  const [showTravelerDropdown, setShowTravelerDropdown] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ code: string; name: string; city: string; country: string } | null>(null);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [departDate, setDepartDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const travelerDropdownRef = useRef<HTMLDivElement>(null);
  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const fromSearchInputRef = useRef<HTMLInputElement>(null);

  const locations = CAR_LOCATIONS;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
      if (
        travelerDropdownRef.current &&
        !travelerDropdownRef.current.contains(event.target as Node)
      ) {
        // Add safety check
        if (typeof setShowTravelerDropdown === 'function') {
          setShowTravelerDropdown(false);
        }
      }
      if (
        fromDropdownRef.current &&
        !fromDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFromDropdown(false);
        setFromSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close all dropdowns on Escape key (Phase 5 - Accessibility)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDatePicker(false);
        setShowTravelerDropdown(false);
        setShowFromDropdown(false);
        setFromSearch("");
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showFromDropdown && fromSearchInputRef.current) {
      setTimeout(() => {
        fromSearchInputRef.current?.focus();
      }, 100);
    }
  }, [showFromDropdown]);

  // Date picker functions
  const formatDate = (date: Date | null) => {
    if (!date) return ct("selectDate");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    setDepartDate(selectedDate);
    setShowDatePicker(false);
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div
          key={`prev-${i}`}
          className="h-8 w-8 flex items-center justify-center text-xs text-foreground"
        >
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month days — past dates (before today) disabled
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const cellStart = startOfLocalDayFromParts(currentYear, currentMonth, day);
      const isToday = cellStart.getTime() === todayStart.getTime();
      const isSelected =
        departDate && departDate.toDateString() === date.toDateString();
      const disabled = cellStart < todayStart;

      days.push(
        <button
          key={day}
          type="button"
          disabled={disabled}
          onClick={() => handleDateSelect(day)}
          className={`h-8 w-8 flex items-center justify-center text-xs rounded-full transition-colors
            ${disabled
              ? "cursor-not-allowed text-muted-foreground/40 opacity-40"
              : isSelected
                ? "bg-primary text-primary-foreground cursor-pointer"
                : isToday
                  ? "bg-primary/20 text-primary font-semibold cursor-pointer hover:bg-primary/30"
                  : "cursor-pointer hover:bg-muted text-foreground"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const updateTravelers = (type, action) => {
    setTravelers((prev) => ({
      ...prev,
      [type]:
        action === "increment"
          ? prev[type] + 1
          : Math.max(type === "adults" ? 1 : 0, prev[type] - 1),
    }));
  };

  const getTravelerText = () => {
    const totalTravelers = travelers.adults + travelers.children;
    const travelersWord =
      totalTravelers === 1 ? ct("travelerSingular") : ct("travelerPlural");
    return `${totalTravelers} ${travelersWord}`;
  };

  const getLocationDisplayText = () => {
    if (selectedLocation) {
      return `${selectedLocation.city} (${selectedLocation.code})`;
    }
    return ct("selectLocation");
  };

  const filteredLocations = locations.filter(
    (location) =>
      location.city.toLowerCase().includes(fromSearch.toLowerCase()) ||
      location.code.toLowerCase().includes(fromSearch.toLowerCase()) ||
      location.name.toLowerCase().includes(fromSearch.toLowerCase()) ||
      location.country.toLowerCase().includes(fromSearch.toLowerCase())
  );

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setShowFromDropdown(false);
    setFromSearch("");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Main Grid Layout - Adjusted widths */}
      <div className="flex flex-col md:flex-row gap-2 pb-4  rounded-lg">
        {/* From Airport - Takes more width - UPDATED LIKE FLIGHTSTAB */}
        <div className="flex-1 min-w-0 relative" ref={fromDropdownRef}>
          <div className="relative">
            {showFromDropdown ? (
              // Search Input (shown when dropdown is open)
              <div className={COMBO_FIELD_SHELL_CLASS}>
                <input
                  ref={fromSearchInputRef}
                  type="text"
                  placeholder={ct("searchPlaceholder")}
                  value={fromSearch}
                  onChange={(e) => setFromSearch(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none text-foreground font-medium placeholder-muted-foreground"
                  autoFocus
                />
              </div>
            ) : (
              // Display Selected Location (shown when dropdown is closed)
              <div
                className={CAR_COMBO_TRIGGER}
                onClick={() => {
                  setShowFromDropdown(true);
                  setFromSearch("");
                }}
              >
                <span className={selectedLocation ? "text-foreground font-semibold" : "text-muted-foreground"}>
                  {getLocationDisplayText()}
                </span>
                <ChevronDown className="w-4 h-4 text-primary dark:text-white" strokeWidth={2} />
              </div>
            )}
            <label className="absolute left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ct("fromAirportLabel")}
            </label>
          </div>

          {/* Dropdown Content */}
          {showFromDropdown && (
            <div className="dropdown-scrollbar absolute top-full left-0 right-0 mt-1 border border-input rounded bg-card shadow-lg z-[500] max-h-80">
              {/* Location List */}
              <div className="py-1">
                {filteredLocations.map((location) => (
                  <div
                    key={location.code}
                    className="px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-foreground">
                          {location.city}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {location.name}
                        </div>
                      </div>
                      <div className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {location.code}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {location.country}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Section - Takes more width */}
        <div className="flex-1 min-w-0 relative" ref={datePickerRef}>
          <div className="relative">
            <div
              className={CAR_COMBO_TRIGGER_SM}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <span
                className={`text-xs sm:text-sm ${departDate ? "text-foreground font-semibold" : "text-muted-foreground"
                  } truncate`}
              >
                {formatDate(departDate)}
              </span>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground dark:text-white pointer-events-none flex-shrink-0" strokeWidth={2} />
            </div>
            <label className="absolute left-3 sm:left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ct("dateLabel")}
            </label>
          </div>

          {/* Custom Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-lg bg-card shadow-lg z-50 p-3 sm:p-4 min-w-[280px] sm:min-w-[320px]">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <button
                  onClick={prevMonth}
                  className="p-1 sm:p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                </button>
                <h3 className="text-sm font-semibold text-foreground">
                  {formatMonthYear(new Date(currentYear, currentMonth))}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-1 sm:p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="h-6 sm:h-8 w-6 sm:w-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>
          )}
        </div>

        {/* Travellers Section - Takes more width */}
        <div className="flex-1 min-w-0 relative" ref={travelerDropdownRef}>
          <div className="relative">
            <div
              className={CAR_COMBO_TRIGGER_SM}
              onClick={() => setShowTravelerDropdown(!showTravelerDropdown)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-white flex-shrink-0" strokeWidth={2} />
                <span className="text-xs sm:text-sm truncate text-muted-foreground">
                  {getTravelerText()}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-primary dark:text-white transition-transform flex-shrink-0 ${showTravelerDropdown ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </div>
            <label className="absolute left-3 sm:left-4 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
              {ct("travelersLabel")}
            </label>

            {/* Traveler Counter Dropdown */}
            {showTravelerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 p-3 sm:p-4 border border-input rounded bg-card shadow-lg z-50 w-full min-w-[250px]">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <span className="text-sm font-bold text-foreground">{ct("adults")}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => updateTravelers("adults", "decrement")}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      disabled={travelers.adults <= 1}
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-4 sm:w-6 text-center text-muted-foreground">
                      {travelers.adults}
                    </span>
                    <button
                      onClick={() => updateTravelers("adults", "increment")}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold text-sm sm:text-base"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{ct("children")}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => updateTravelers("children", "decrement")}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      disabled={travelers.children <= 0}
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-4 sm:w-6 text-center text-muted-foreground">
                      {travelers.children}
                    </span>
                    <button
                      onClick={() => updateTravelers("children", "increment")}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-input flex items-center justify-center text-primary hover:bg-primary/10 font-bold text-sm sm:text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Button - Full width on mobile, square on desktop */}
        <div className="w-full md:w-14 lg:w-16 flex-shrink-0 flex items-end">
          <Link className="w-full h-14 sm:h-16 bg-primary hover:bg-primary-600 text-white rounded-lg flex items-center justify-center transition-colors font-semibold md:aspect-square" href="/cars" aria-label={ct("searchCarsAria")}>
            <Search className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CarsTab;