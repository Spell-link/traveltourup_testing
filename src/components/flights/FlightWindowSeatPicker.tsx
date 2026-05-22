"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Map, Square, X } from "lucide-react";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import {
  buildSelectedSeatSummaries,
  countAvailableWindowSeats,
  listAvailableWindowSeats,
  segmentLabel,
  type WindowSeatSide,
} from "@/lib/flights/seat-map-utils";
import { FlightSeatMapGrid } from "@/components/flights/FlightSeatMapGrid";
import { FlightSeatMapSkeleton } from "@/components/flights/FlightSkeletons";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

type FlightWindowSeatPickerProps = {
  offer: FlightOfferDTO;
  seatMaps: SeatMapDTO[] | null;
  seatMapsLoading: boolean;
  seatMapsError: string | null;
  seatPassengerId: string;
  onSeatPassengerChange: (passengerId: string) => void;
  seatSelections: Record<string, string>;
  onSelectSeat: (segmentId: string, passengerId: string, serviceId: string | null) => void;
  formatPrice: (amount: number, currency: string) => string;
  compact?: boolean;
};

function passengerLabel(offer: FlightOfferDTO, passengerId: string, index: number): string {
  const p = offer.passengers.find((x) => x.id === passengerId);
  const type = p?.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : "Passenger";
  return `${type} ${index + 1}`;
}

function sideLabel(side: WindowSeatSide, t: ReturnType<typeof useTranslations>): string {
  return side === "left" ? t("seatWindowLeft") : t("seatWindowRight");
}

export function FlightWindowSeatPicker({
  offer,
  seatMaps,
  seatMapsLoading,
  seatMapsError,
  seatPassengerId,
  onSeatPassengerChange,
  seatSelections,
  onSelectSeat,
  formatPrice,
  compact = false,
}: FlightWindowSeatPickerProps) {
  const t = useTranslations("Booking.sidebar");
  const [showFullMap, setShowFullMap] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const windowSeats = useMemo(() => {
    if (!seatMaps?.length || !seatPassengerId) return [];
    return listAvailableWindowSeats(seatMaps, offer, seatPassengerId);
  }, [seatMaps, offer, seatPassengerId]);

  const selectedSummaries = useMemo(
    () => buildSelectedSeatSummaries(seatMaps, offer, seatSelections, seatPassengerId),
    [seatMaps, offer, seatSelections, seatPassengerId],
  );

  const windowSeatCount = useMemo(
    () => (seatMaps && seatPassengerId ? countAvailableWindowSeats(seatMaps, seatPassengerId) : 0),
    [seatMaps, seatPassengerId],
  );

  const segments = useMemo(() => {
    if (!seatMaps?.length) return [];
    return seatMaps.map((sm) => {
      const id = sm.segment_id ?? sm.id;
      return { id, label: segmentLabel(offer, sm.segment_id) };
    });
  }, [seatMaps, offer]);

  const filteredWindowSeats = useMemo(() => {
    if (!activeSegmentId) return windowSeats;
    return windowSeats.filter((ws) => ws.segmentId === activeSegmentId);
  }, [windowSeats, activeSegmentId]);

  const passengerIndex = offer.passengers.findIndex((p) => p.id === seatPassengerId);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <div className="flex items-start gap-2">
          <Square className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          <div>
            <h3 className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>
              {t("seatWindowTitle")}
            </h3>
            <p className={`mt-0.5 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
              {t("seatWindowDescription")}
            </p>
          </div>
        </div>
      </div>

      {offer.passengers.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {offer.passengers.map((p, idx) => {
            const active = p.id === seatPassengerId;
            const hasSelection = Object.entries(seatSelections).some(
              ([key, svcId]) => key.endsWith(`::${p.id}`) && Boolean(svcId),
            );
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSeatPassengerChange(p.id)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {passengerLabel(offer, p.id, idx)}
                {hasSelection ? <Check className="h-3 w-3" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedSummaries.length > 0 ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("seatSelectedHeading")}
          </p>
          <ul className="space-y-2">
            {selectedSummaries.map((s) => (
              <li
                key={`${s.segmentId}-${s.designator}`}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {s.segmentLabel} · {s.designator}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.side === "left" || s.side === "right"
                      ? sideLabel(s.side, t)
                      : t("seatPositionOther")}
                  </p>
                  {s.disclosures.length > 0 ? (
                    <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
                      {s.disclosures.join(" ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(Number.parseFloat(s.amount), s.currency)}
                  </span>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t("seatClearSelection")}
                    onClick={() => onSelectSeat(s.segmentId, seatPassengerId, null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {seatMapsError ? <p className="text-sm text-destructive">{seatMapsError}</p> : null}

      {seatMapsLoading ? (
        <FlightSeatMapSkeleton />
      ) : !seatMaps || seatMaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("seatMapUnavailable")}</p>
      ) : windowSeatCount === 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          {t("seatNoWindowAvailable")}
        </div>
      ) : (
        <>
          {segments.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveSegmentId(null)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeSegmentId === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                ].join(" ")}
              >
                {t("seatAllSegments")}
              </button>
              {segments.map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setActiveSegmentId(seg.id)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeSegmentId === seg.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  ].join(" ")}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          ) : null}

          <ul className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {filteredWindowSeats.map((ws) => {
              const key = `${ws.segmentId}::${seatPassengerId}`;
              const selected = seatSelections[key] === ws.serviceId;
              return (
                <li key={`${ws.segmentId}-${ws.designator}-${ws.serviceId}`}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectSeat(ws.segmentId, seatPassengerId, selected ? null : ws.serviceId)
                    }
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-start transition-colors",
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-sky-400/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/20",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold tabular-nums text-foreground">
                          {ws.designator}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
                          {sideLabel(ws.side, t)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ws.segmentLabel}
                        {ws.cabinClass ? ` · ${ws.cabinClass}` : ""}
                      </p>
                      {ws.disclosures.length > 0 ? (
                        <p className="mt-1 line-clamp-2 text-[10px] text-amber-800 dark:text-amber-200">
                          {ws.disclosures[0]}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(Number.parseFloat(ws.amount), ws.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selected ? t("seatSelected") : t("seatSelect")}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="text-[11px] text-muted-foreground">{t("seatDuffelNote")}</p>
        </>
      )}

      {seatMaps && seatMaps.length > 0 ? (
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-between px-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowFullMap((v) => !v)}
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Map className="h-4 w-4" aria-hidden />
              {showFullMap ? t("seatHideFullMap") : t("seatShowFullMap")}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFullMap ? "rotate-180" : ""}`}
              aria-hidden
            />
          </Button>
          {showFullMap ? (
            <div className={`mt-3 ${compact ? "max-h-[min(52vh,22rem)] overflow-y-auto pr-1 dropdown-scrollbar" : ""}`}>
              <FlightSeatMapGrid
                offer={offer}
                seatMaps={seatMaps}
                seatPassengerId={seatPassengerId}
                seatSelections={seatSelections}
                onSelectSeat={onSelectSeat}
                formatPrice={formatPrice}
                compact={compact}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {passengerIndex >= 0 && offer.passengers.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          {t("seatPassengerHint", { name: passengerLabel(offer, seatPassengerId, passengerIndex) })}
        </p>
      ) : null}
    </div>
  );
}
