"use client";

import { Plane } from "lucide-react";

import {
  formatLayoverLabel,
  formatSegmentDateTime,
  layoverMinutesBetween,
  parseOrderItineraryFromSnapshot,
  type OrderItinerarySlice,
} from "@/lib/flights/order-itinerary-display";

type Props = {
  snapshot: unknown;
  /** When set, only render this slice index. */
  sliceIndex?: number;
  className?: string;
};

function SliceTimeline({ slice }: { slice: OrderItinerarySlice }) {
  const { segments } = slice;
  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">
          {slice.origin_iata || "—"} → {slice.destination_iata || "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="border-b border-border/40 px-4 py-3">
        <p className="font-semibold text-foreground">
          {slice.origin_iata} → {slice.destination_iata}
        </p>
        <p className="text-xs text-muted-foreground">
          {segments.length === 1 ? "Non-stop" : `${segments.length - 1} stop${segments.length > 2 ? "s" : ""}`}
        </p>
      </div>
      <div className="px-4 py-3">
        {segments.map((seg, j) => {
          const next = segments[j + 1];
          const layoverMin =
            next && seg.arriving_at && next.departing_at
              ? layoverMinutesBetween(seg.arriving_at, next.departing_at)
              : null;
          const flightLabel =
            seg.marketing_carrier_name && seg.flight_number
              ? `${seg.marketing_carrier_name} ${seg.flight_number}`
              : seg.flight_number
                ? `Flight ${seg.flight_number}`
                : null;

          return (
            <div key={`${seg.origin_iata}-${seg.destination_iata}-${j}`}>
              <div className="relative flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plane className="h-4 w-4" aria-hidden />
                  </div>
                  {j < segments.length - 1 || layoverMin ? (
                    <div className="mt-1 w-px flex-1 bg-border min-h-[24px]" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  {flightLabel ? (
                    <p className="text-sm font-medium text-foreground">{flightLabel}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {seg.cabin_class ? `${seg.cabin_class.replace(/_/g, " ")} · ` : ""}
                    {seg.origin_iata} → {seg.destination_iata}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Depart {formatSegmentDateTime(seg.departing_at)}
                    {seg.origin_terminal ? ` · Terminal ${seg.origin_terminal}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Arrive {formatSegmentDateTime(seg.arriving_at)}
                    {seg.destination_terminal ? ` · Terminal ${seg.destination_terminal}` : ""}
                  </p>
                </div>
              </div>
              {layoverMin != null && layoverMin > 0 ? (
                <div className="mb-4 ml-11 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {formatLayoverLabel(layoverMin)} at {seg.destination_iata}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FlightOrderJourneyTimeline({ snapshot, sliceIndex, className }: Props) {
  const slices = parseOrderItineraryFromSnapshot(snapshot);
  const filtered =
    sliceIndex != null ? slices.filter((s) => s.slice_index === sliceIndex) : slices;

  if (filtered.length === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className ?? ""}`}>
        Itinerary details are not available yet.
      </p>
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {filtered.map((slice) => (
        <SliceTimeline key={slice.slice_index} slice={slice} />
      ))}
    </div>
  );
}
