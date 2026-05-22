"use client";

import React from "react";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapCabinDTO, SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import {
  getSeatPositionInRow,
  segmentLabel,
  type SeatPositionKind,
} from "@/lib/flights/seat-map-utils";

type FlightSeatMapGridProps = {
  offer: FlightOfferDTO;
  seatMaps: SeatMapDTO[];
  seatPassengerId: string;
  seatSelections: Record<string, string>;
  onSelectSeat: (segmentId: string, passengerId: string, serviceId: string | null) => void;
  formatPrice: (amount: number, currency: string) => string;
  compact?: boolean;
};

function nonSeatLabel(type: string): string {
  switch (type) {
    case "exit_row":
      return "Exit";
    case "lavatory":
      return "WC";
    case "galley":
      return "Galley";
    case "bassinet":
      return "Bassinet";
    case "empty":
      return "";
    default:
      return "·";
  }
}

function positionRingClass(kind: SeatPositionKind, selected: boolean): string {
  if (selected) return "ring-2 ring-primary ring-offset-1 ring-offset-background";
  if (kind === "left" || kind === "right") return "ring-1 ring-sky-400/50 dark:ring-sky-500/40";
  return "";
}

export function FlightSeatMapGrid({
  offer,
  seatMaps,
  seatPassengerId,
  seatSelections,
  onSelectSeat,
  formatPrice,
  compact = false,
}: FlightSeatMapGridProps) {
  const seatSize = compact ? "h-8 min-w-[2rem] text-[10px]" : "h-9 min-w-[2.25rem] text-xs";

  return (
    <div className="space-y-6">
      {seatMaps.map((sm) => {
        const segmentKey = sm.segment_id ?? sm.id;
        return (
          <div key={sm.id} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {segmentLabel(offer, sm.segment_id)}
            </h3>
            {sm.cabins.map((cab, ci) => (
              <CabinGrid
                key={`${sm.id}-cab-${ci}`}
                cabin={cab}
                segmentKey={segmentKey}
                seatPassengerId={seatPassengerId}
                seatSelections={seatSelections}
                onSelectSeat={onSelectSeat}
                formatPrice={formatPrice}
                seatSize={seatSize}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function CabinGrid({
  cabin,
  segmentKey,
  seatPassengerId,
  seatSelections,
  onSelectSeat,
  formatPrice,
  seatSize,
}: {
  cabin: SeatMapCabinDTO;
  segmentKey: string;
  seatPassengerId: string;
  seatSelections: Record<string, string>;
  onSelectSeat: (segmentId: string, passengerId: string, serviceId: string | null) => void;
  formatPrice: (amount: number, currency: string) => string;
  seatSize: string;
}) {
  const selectionKey = `${segmentKey}::${seatPassengerId}`;
  const selectedServiceId = seatSelections[selectionKey];

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {cabin.cabin_class ?? "Cabin"}
        {cabin.deck != null ? ` · deck ${cabin.deck}` : ""}
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-3">
        <div className="mx-auto inline-flex min-w-full flex-col items-center gap-0.5">
          {cabin.rows.map((row, ri) => {
            const rowSeats = row.sections.flatMap((s) => s.elements.filter((e) => e.type === "seat"));
            const rowNumber = rowSeats[0]?.designator?.replace(/[^\d]/g, "") ?? null;

            return (
              <div key={`r-${ri}`} className="flex items-center gap-2">
                {rowNumber ? (
                  <span className="w-6 shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">
                    {rowNumber}
                  </span>
                ) : (
                  <span className="w-6 shrink-0" aria-hidden />
                )}
                <div className="flex items-center justify-center gap-3">
                  {row.sections.map((sec, si) => (
                    <div key={`s-${si}`} className="flex items-center gap-1">
                      {sec.elements.map((el, ei) => {
                        if (el.type !== "seat") {
                          return (
                            <span
                              key={`e-${ei}`}
                              className={`inline-flex ${seatSize} items-center justify-center text-[9px] text-muted-foreground/80`}
                              title={el.type}
                            >
                              {nonSeatLabel(el.type)}
                            </span>
                          );
                        }

                        const svcForPax = el.services.find((x) => x.passenger_id === seatPassengerId);
                        const pickedHere = svcForPax && selectedServiceId === svcForPax.id;
                        const disabled = !svcForPax;
                        const position = getSeatPositionInRow(row, el);
                        const isWindow = position === "left" || position === "right";

                        return (
                          <button
                            key={`e-${ei}`}
                            type="button"
                            disabled={disabled}
                            title={
                              svcForPax
                                ? `${el.designator ?? "?"} · ${formatPrice(Number.parseFloat(svcForPax.total_amount), svcForPax.total_currency)}${isWindow ? " · Window" : ""}`
                                : el.designator ?? "Unavailable"
                            }
                            onClick={() => {
                              if (!svcForPax) return;
                              onSelectSeat(
                                segmentKey,
                                seatPassengerId,
                                pickedHere ? null : svcForPax.id,
                              );
                            }}
                            className={[
                              seatSize,
                              "rounded-md font-semibold border transition-colors",
                              positionRingClass(position, Boolean(pickedHere)),
                              disabled
                                ? "border-transparent bg-muted/40 text-muted-foreground cursor-not-allowed"
                                : pickedHere
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : isWindow
                                    ? "border-sky-300/70 bg-sky-50 text-sky-950 hover:border-primary/60 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-100"
                                    : "border-border bg-background hover:border-primary/60",
                            ].join(" ")}
                          >
                            {el.designator?.replace(/^\d+/, "") || "—"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
