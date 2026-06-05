"use client";

import React, { useState, memo } from "react";
import { Link } from "@/i18n/navigation";
import {
  Star,
  Wifi,
  UtensilsCrossed,
  Tv,
  CheckCircle,
  XCircle,
  Check,
  Clock,
  Plane,
  Luggage,
} from "lucide-react";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import { ComparisonCheckbox } from "@/components/shared/GenericComparison";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export type FlightResultComparisonApi = {
  isSelected: (id: string) => boolean;
  toggleItem: (flight: FlightListDisplay) => void;
};

export type FlightResultCardProps = {
  flight: FlightListDisplay;
  variant?: "list" | "grid";
  comparison: FlightResultComparisonApi;
  /** e.g. "per traveler", "round trip per traveler" — derived from trip type */
  priceSubtitle: string;
  /** Optional href for select (default `/flights/:id`) — Phase 4 may override */
  selectHref?: string;
  /** When set, primary CTA is a button (e.g. outbound cluster pick) instead of navigation. */
  onSelect?: () => void;
  hideComparison?: boolean;
  /** Order-change flow: show delta pricing instead of full fare. */
  changeDelta?: number;
};

function formatSliceDateTime(isoDate: string | null | undefined, timeHHmm: string): string {
  if (!isoDate) return timeHHmm;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return `${isoDate} ${timeHHmm}`;
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const FlightResultCard = memo(function FlightResultCard({
  flight,
  variant = "list",
  comparison,
  priceSubtitle,
  selectHref,
  onSelect,
  hideComparison = false,
  changeDelta,
}: FlightResultCardProps) {
  const tc = useTranslations("Common");
  const tChange = useTranslations("Flights.change");
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const isGrid = variant === "grid";
  const isSelectedForComparison = comparison.isSelected(flight.id);
  const [expanded, setExpanded] = useState(false);
  const href =
    selectHref ??
    (flight.id.startsWith("cluster:") ? null : `/flights/${flight.id}`);

  const priceLabel =
    changeDelta !== undefined
      ? changeDelta < 0
        ? tChange("refundAmount", {
            amount: formatPrice(Math.abs(changeDelta), flight.currency || "USD", locale),
          })
        : changeDelta === 0
          ? tChange("noExtraCharge")
          : tChange("additionalCost", {
              amount: formatPrice(changeDelta, flight.currency || "USD", locale),
            })
      : formatPrice(flight.price, flight.currency || "USD", locale);

  const logoUrl = flight.airlineLogoUrl;
  const firstSeg = flight.segmentDetails?.[0];
  const lastSeg =
    flight.segmentDetails?.length && flight.segmentDetails.length > 0
      ? flight.segmentDetails[flight.segmentDetails.length - 1]
      : undefined;

  return (
    <div
      className={`bg-card rounded-xl shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 ${isGrid ? "p-4 h-full flex flex-col" : "p-6 mb-6"}`}
    >
      <div
        className={`flex flex-col ${isGrid ? "flex-1" : "lg:flex-row lg:items-center"} justify-between ${isGrid ? "gap-3" : ""}`}
      >
        <div className="flex-1 min-w-0">
          {/* div+role=button: must not wrap real <button>s — invalid HTML & hydration errors */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((e) => !e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((x) => !x);
              }
            }}
            className={`w-full cursor-pointer text-left rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${!isGrid ? "-m-1 p-1" : "-m-1 p-1"}`}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide flight details" : "Show flight details"}
          >
            {isGrid ? (
              <>
                <div className="mb-2 flex min-w-0 items-center">
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-full w-full object-contain p-[6px]" />
                    ) : (
                      <span className="text-xs font-bold text-primary">{flight.airlineCode}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-foreground hover:text-primary cursor-pointer">
                      {href ? (
                        <Link href={href} onClick={(e) => e.stopPropagation()}>
                          {flight.airlineName ?? flight.airline}
                        </Link>
                      ) : (
                        <span onClick={(e) => e.stopPropagation()}>{flight.airlineName ?? flight.airline}</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{flight.flightNumber}</p>
                  </div>
                </div>
                <div
                  className="mb-2 grid grid-cols-3 items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex min-w-0 justify-start">
                    {!hideComparison ? (
                      <ComparisonCheckbox
                        isSelected={isSelectedForComparison}
                        onToggle={() => comparison.toggleItem(flight)}
                      />
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-end">
                    <Star className="mr-1 text-yellow-500" />
                    <span className="font-semibold text-foreground">{flight.rating}</span>
                    <span className="ml-1 text-sm text-muted-foreground">({flight.reviews})</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center">
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-full w-full object-contain p-[6px]" />
                    ) : (
                      <span className="text-xs font-bold text-primary">{flight.airlineCode}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-foreground hover:text-primary cursor-pointer">
                      {href ? (
                        <Link href={href} onClick={(e) => e.stopPropagation()}>
                          {flight.airlineName ?? flight.airline}
                        </Link>
                      ) : (
                        <span onClick={(e) => e.stopPropagation()}>{flight.airlineName ?? flight.airline}</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{flight.flightNumber}</p>
                  </div>
                </div>
                <div
                  className="flex w-full shrink-0 items-center justify-evenly gap-2 sm:w-auto sm:justify-start"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!hideComparison ? (
                    <ComparisonCheckbox
                      isSelected={isSelectedForComparison}
                      onToggle={() => comparison.toggleItem(flight)}
                    />
                  ) : null}
                  <div className="flex shrink-0 items-center">
                    <Star className="mr-1 text-yellow-500" />
                    <span className="font-semibold">{flight.rating}</span>
                    <span className="ml-1 text-sm text-muted-foreground">({flight.reviews})</span>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex items-center justify-between ${isGrid ? "mb-2" : "mb-4"}`}>
              {isGrid ? (
                <>
                  <div className="min-w-0 text-left">
                    <div className="text-lg font-bold text-foreground">{flight.departureTime}</div>
                    <div className="text-sm text-muted-foreground">{flight.departureAirport}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center text-sm text-muted-foreground">
                    <span>{flight.duration}</span>
                    <span className="mt-0.5 text-xs">
                      {flight.stops === 0
                        ? "Direct"
                        : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-lg font-bold text-foreground">{flight.arrivalTime}</div>
                    <div className="text-sm text-muted-foreground">{flight.arrivalAirport}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{flight.departureTime}</div>
                    <div className="text-sm text-muted-foreground">
                      {flight.departureAirport} • {flight.departureTerminal}
                    </div>
                    <div className="text-xs text-muted-foreground">{flight.departureDate || "—"}</div>
                  </div>

                  <div className="flex-1 px-2 sm:px-4">
                    <div className="mb-3 text-center text-sm text-muted-foreground">{flight.duration}</div>
                    <div className="relative">
                      <div className="h-1 rounded-full bg-muted"></div>
                      <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary"></div>
                      <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-success"></div>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="rounded-full border border-input bg-card px-2 py-1 text-xs">
                          {flight.stopDetails}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      {flight.stops === 0
                        ? "Direct"
                        : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                      {flight.layoverSummary ? ` · ${flight.layoverSummary}` : ""}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold">{flight.arrivalTime}</div>
                    <div className="text-sm text-muted-foreground">
                      {flight.arrivalAirport} • {flight.arrivalTerminal}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {flight.arrivalDateLabel || flight.departureDate || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {expanded && firstSeg && lastSeg ? (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="relative pl-4">
                <div className="absolute left-0 top-2 bottom-8 w-px border-l-2 border-dashed border-muted-foreground/40" />
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                    <div className="font-semibold text-foreground">
                      {formatSliceDateTime(firstSeg.departing_at, flight.departureTime)}
                    </div>
                    <div className="text-muted-foreground">
                      Depart {firstSeg.origin_name ? `${firstSeg.origin_name} ` : ""}({firstSeg.origin_iata}
                      ){firstSeg.origin_terminal ? `, Terminal ${firstSeg.origin_terminal}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-1 text-muted-foreground">
                    <Plane className="h-4 w-4 shrink-0" />
                    <span>Flight duration: {flight.duration}</span>
                    {firstSeg.cabin_class ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">
                        {firstSeg.cabin_class.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
                    <div className="font-semibold text-foreground">
                      {formatSliceDateTime(lastSeg.arriving_at, flight.arrivalTime)}
                    </div>
                    <div className="text-muted-foreground">
                      Arrive {lastSeg.destination_name ? `${lastSeg.destination_name} ` : ""}(
                      {lastSeg.destination_iata})
                      {lastSeg.destination_terminal
                        ? `, Terminal ${lastSeg.destination_terminal}`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Luggage className="h-3.5 w-3.5" />
                  {flight.baggage}
                </span>
              </div>
            </div>
          ) : null}

          {!isGrid && (
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-4">
              {flight.amenities.includes("wifi") && (
                <div className="flex items-center text-muted-foreground">
                  <Wifi className="mr-1" />
                  <span className="text-sm">Wi-Fi</span>
                </div>
              )}
              {flight.amenities.includes("meals") && (
                <div className="flex items-center text-muted-foreground">
                  <UtensilsCrossed className="mr-1" />
                  <span className="text-sm">Meals</span>
                </div>
              )}
              {flight.amenities.includes("entertainment") && (
                <div className="flex items-center text-muted-foreground">
                  <Tv className="mr-1" />
                  <span className="text-sm">Entertainment</span>
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                {flight.refundable ? (
                  <>
                    <CheckCircle className="mr-1 text-success" />
                    <span className="text-sm">Refundable</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 text-destructive" />
                    <span className="text-sm">Non-refundable</span>
                  </>
                )}
              </div>
              <div className="flex items-center text-muted-foreground">
                <span className="text-sm">{flight.baggage}</span>
              </div>
            </div>
          )}
          {isGrid && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
              <span>{flight.baggage}</span>
              {flight.refundable && <CheckCircle className="text-success" />}
            </div>
          )}
        </div>

        <div
          className={`${isGrid ? "border-t pt-3 mt-auto" : "lg:border-l lg:pl-6 lg:ml-6"} mt-4 lg:mt-0 shrink-0`}
        >
          <div className="text-right mb-2">
            <div className={`font-bold text-primary ${isGrid ? "text-2xl" : "text-3xl"}`}>
              {priceLabel}
            </div>
            <div className="text-muted-foreground text-sm">{priceSubtitle}</div>
          </div>
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-colors duration-300"
            >
              {tc("select")}
            </button>
          ) : href ? (
            <Link href={href}>
              <button
                type="button"
                className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-colors duration-300"
              >
                {tc("select")}
              </button>
            </Link>
          ) : null}
          {changeDelta === undefined ? (
            <div className="text-success text-sm text-right mt-2">
              <Check className="inline mr-1" />
              {tc("freeCancellation")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
