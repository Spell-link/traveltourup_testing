"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { PreferredAirlinesCombobox } from "@/components/flights/PreferredAirlinesCombobox";
import { FlightSliceTimePopover } from "@/components/flights/FlightSliceTimePopover";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { EditSearchSummaryCard } from "@/components/shared/EditSearchSummaryCard";
import { formatMoneyDisplay } from "@/lib/currency/format-display";

export const FLIGHT_SORT_IDS = [
  "best",
  "price_asc",
  "price_desc",
  "duration_asc",
  "duration_desc",
] as const;

export type FlightSortId = (typeof FLIGHT_SORT_IDS)[number];

export type StopsFilterMode = "any" | "direct" | "one" | "two";

const STOPS_MODE_ORDER: readonly StopsFilterMode[] = ["any", "direct", "one", "two"];

const FILTER_EXPAND_TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2  bg-transparent  text-left text-sm font-medium text-foreground transition ";

export type FlightResultsFilterSidebarProps = {
  sortBy: string;
  onSortChange: (id: string) => void;
  priceMax: number;
  priceSliderMax: number;
  onPriceMaxChange: (v: number) => void;
  stopsMode: StopsFilterMode;
  onStopsModeChange: (m: StopsFilterMode) => void;
  airlineOptions: { code: string; name: string }[];
  selectedAirline: string;
  onAirlineChange: (iata: string) => void;
  flightNumberQuery: string;
  onFlightNumberChange: (q: string) => void;
  depTimeFrom: string;
  depTimeTo: string;
  onDepTimeFrom: (t: string) => void;
  onDepTimeTo: (t: string) => void;
  arrTimeFrom: string;
  arrTimeTo: string;
  onArrTimeFrom: (t: string) => void;
  onArrTimeTo: (t: string) => void;
  onClearAll: () => void;
  /** When set, Duffel-style summary card is shown above filters (results layout only). */
  editSearchSummary?: { headline: string; lines: string[] } | null;
  onEditSearch?: () => void;
  onFlightSearchStart?: () => void;
};

export function FlightResultsFilterSidebar({
  sortBy,
  onSortChange,
  priceMax,
  priceSliderMax,
  onPriceMaxChange,
  stopsMode,
  onStopsModeChange,
  airlineOptions,
  selectedAirline,
  onAirlineChange,
  flightNumberQuery,
  onFlightNumberChange,
  depTimeFrom,
  depTimeTo,
  onDepTimeFrom,
  onDepTimeTo,
  arrTimeFrom,
  arrTimeTo,
  onArrTimeFrom,
  onArrTimeTo,
  onClearAll,
  editSearchSummary,
  onEditSearch,
  onFlightSearchStart,
}: FlightResultsFilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenStops, setIsOpenStops] = useState(false);
  const tSort = useTranslations("Flights.sort");
  const tStops = useTranslations("Flights.stops");
  const tFilters = useTranslations("Flights.filters");
  const tCommon = useTranslations("Common");
  const tResults = useTranslations("Flights.results");

  const sortSummary = FLIGHT_SORT_IDS.includes(sortBy as FlightSortId)
    ? tSort(sortBy as FlightSortId)
    : tSort("sortBy");
  const stopsSummary = STOPS_MODE_ORDER.includes(stopsMode)
    ? tStops(stopsMode)
    : tStops("label");
  return (
    <div className="bg-card lg:mb-0 lg:rounded-xl lg:p-6 lg:shadow-lg">
      {editSearchSummary && onEditSearch ? (
        <EditSearchSummaryCard
          headline={editSearchSummary.headline}
          lines={editSearchSummary.lines}
          editLabel={tResults("editSearchButton")}
          onEdit={onEditSearch}
          flightMobileFullscreenEdit
          onFlightSearchStart={onFlightSearchStart}
        />
      ) : null}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-foreground">{tFilters("title")}</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="text-primary hover:text-primary-600 text-sm font-semibold"
        >
          {tCommon("clearAll")}
        </button>
      </div>

      <div className="mb-8 text-foreground">
        <h3 className="font-bold mb-2">{tSort("sortBy")}</h3>
        <button
          type="button"
          className={FILTER_EXPAND_TRIGGER_CLASS}
          aria-expanded={isOpen}
          aria-controls="flight-sort-options"
          onClick={() => setIsOpen((v) => !v)}
        >
          <span className="min-w-0 truncate text-muted-foreground">{sortSummary}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {isOpen ? (
          <div id="flight-sort-options" className="mt-2 space-y-2">
            {FLIGHT_SORT_IDS.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <input
                  type="radio"
                  name="flight-sort"
                  checked={sortBy === id}
                  onChange={() => onSortChange(id)}
                  className="h-4 w-4 text-primary"
                />
                <span>{tSort(id)}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mb-8">
        <h3 className="font-bold mb-4 flex justify-between text-foreground">
          <span>{tFilters("price")}</span>
          <span className="text-primary tabular-nums">
            {formatMoneyDisplay(priceMax, "USD", "en-US")}
          </span>
        </h3>
        <input
          type="range"
          min={0}
          max={priceSliderMax}
          value={Math.min(priceMax, priceSliderMax)}
          onChange={(e) => onPriceMaxChange(parseInt(e.target.value, 10) || 0)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-muted-foreground text-sm mt-2">
          <span>$0</span>
          <span className="tabular-nums">${Math.round(priceSliderMax / 2)}</span>
          <span className="tabular-nums">${priceSliderMax}</span>
        </div>
      </div>

      <div className="mb-8 text-foreground">
        <h3 className="font-bold mb-2">{tStops("label")}</h3>
        <button
          type="button"
          className={FILTER_EXPAND_TRIGGER_CLASS}
          aria-expanded={isOpenStops}
          aria-controls="flight-stops-options"
          onClick={() => setIsOpenStops((v) => !v)}
        >
          <span className="min-w-0 truncate text-muted-foreground">{stopsSummary}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpenStops && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {isOpenStops ? (
          <div id="flight-stops-options" className="mt-2 space-y-2">
            {STOPS_MODE_ORDER.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <input
                  type="radio"
                  name="flight-stops"
                  checked={stopsMode === id}
                  onChange={() => onStopsModeChange(id)}
                  className="h-4 w-4 text-primary"
                />
                <span>{tStops(id)}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mb-8 text-foreground">
        <h3 className="font-bold mb-2">{tFilters("airlines")}</h3>
        <PreferredAirlinesCombobox
          airlines={airlineOptions.map((a) => ({ iata: a.code, name: a.name }))}
          selected={selectedAirline ? [selectedAirline] : []}
          onChange={(iatas) => onAirlineChange(iatas[0] ?? "")}
          selectionMode="single"
        />
      </div>

      <div className="mb-8 text-foreground">
        <h3 className="font-bold mb-2">{tFilters("flightNumber")}</h3>
        <Input
          type="text"
          value={flightNumberQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFlightNumberChange(e.target.value.toUpperCase())}
          placeholder={tFilters("flightNumberPlaceholder")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className=" text-foreground">
        <h3 className="font-bold mb-2">{tFilters("flightTime")}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {tFilters("flightTimeHint")}
        </p>
        <FlightSliceTimePopover
          variant="inline"
          takeoffFrom={depTimeFrom}
          takeoffTo={depTimeTo}
          landingFrom={arrTimeFrom}
          landingTo={arrTimeTo}
          onConfirm={(next) => {
            onDepTimeFrom(next.takeoffFrom);
            onDepTimeTo(next.takeoffTo);
            onArrTimeFrom(next.landingFrom);
            onArrTimeTo(next.landingTo);
          }}
          onClose={() => {}}
        />
      </div>
    </div>
  );
}
