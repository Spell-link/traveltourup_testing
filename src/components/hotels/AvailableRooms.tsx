"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Award,
  BadgePercent,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  MapPin,
  Minus,
  Plus,
  PlaneTakeoff,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { HotelRoom } from "@/data/mock-hotels";
import { ImageGallery } from "@/components/shared/ImageGallery";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";
import {
  AVAILABLE_ROOMS_PAGE_SIZE,
  getHotelResultsPaginationRange,
} from "@/components/hotels/hotel-results-pagination";
import { shouldUnoptimizeStaysSupplierImage } from "@/lib/images/stays-supplier-image";
import { useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export interface AvailableRoomsProps {
  rooms: HotelRoom[];
  currency?: string;
  selectedRooms: HotelRoom[];
  onAddRoom: (room: HotelRoom) => void;
  onRemoveRoom: (room: HotelRoom) => void;
  /**
   * `single` — Duffel Stays: one selected rate → quote → book ([searching for stays](https://duffel.com/docs/guides/searching-for-stays)).
   * `multi` — mock / legacy: quantity per room type.
   */
  selectionMode?: "single" | "multi";
  /** When true, show Duffel total-for-stay and policy hints (cancellation, negotiated, loyalty). */
  showDuffelRateHints?: boolean;
  /** Hotel area/address for the map pin row (from parent hotel). */
  locationLabel?: string;
  /** Hotel guest score ~0–10; shown as “X of 100” and star fill when set. */
  hotelGuestRating?: number;
}

function formatUtcBeforeLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/**
 * Room list for hotel detail. Duffel path: pick one rate, then quote locks price ([Getting Started with Stays](https://duffel.com/docs/guides/getting-started-with-stays)).
 * Cancellation timeline follows [Displaying the Cancellation Timeline](https://duffel.com/docs/guides/displaying-the-cancellation-timeline).
 */
export function AvailableRooms({
  rooms,
  currency = "USD",
  selectedRooms,
  onAddRoom,
  onRemoveRoom,
  selectionMode = "multi",
  showDuffelRateHints = false,
  locationLabel,
  hotelGuestRating,
}: AvailableRoomsProps) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const stayFormSnap = useMemo(
    () => (typeof window !== "undefined" ? readStaysSearchFormSnapshot() : null),
    [],
  );
  const [roomPhotosOpen, setRoomPhotosOpen] = useState<string | null>(null);
  /** Room ids with cancellation + rate policy block expanded (default: collapsed). */
  const [expandedPolicyRoomIds, setExpandedPolicyRoomIds] = useState(() => new Set<string>());
  const [roomListPage, setRoomListPage] = useState(1);
  const single = selectionMode === "single";

  const togglePolicyExpanded = (roomId: string) => {
    setExpandedPolicyRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const totalRoomPages = useMemo(() => {
    if (!rooms?.length) return 0;
    return Math.ceil(rooms.length / AVAILABLE_ROOMS_PAGE_SIZE);
  }, [rooms]);

  const displayRoomPage = useMemo(() => {
    if (totalRoomPages === 0) return 1;
    return Math.min(roomListPage, totalRoomPages);
  }, [roomListPage, totalRoomPages]);

  const paginatedRooms = useMemo(() => {
    if (!rooms?.length) return [];
    const start = (displayRoomPage - 1) * AVAILABLE_ROOMS_PAGE_SIZE;
    return rooms.slice(start, start + AVAILABLE_ROOMS_PAGE_SIZE);
  }, [rooms, displayRoomPage]);

  const roomPaginationItems = useMemo(
    () => (totalRoomPages > 1 ? getHotelResultsPaginationRange(displayRoomPage, totalRoomPages) : []),
    [displayRoomPage, totalRoomPages],
  );

  useEffect(() => {
    setRoomListPage(1);
  }, [rooms.length]);

  useEffect(() => {
    if (totalRoomPages === 0) return;
    setRoomListPage((p) => Math.min(p, totalRoomPages));
  }, [totalRoomPages]);

  if (!rooms?.length) return null;

  const checkInLabel =
    stayFormSnap?.check_in_date
      ? new Date(`${stayFormSnap.check_in_date}T12:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      : null;
  const searchStayNights =
    stayFormSnap?.check_in_date && stayFormSnap?.check_out_date
      ? Math.max(
        1,
        Math.round(
          (new Date(stayFormSnap.check_out_date).getTime() -
            new Date(stayFormSnap.check_in_date).getTime()) /
          86400000,
        ),
      )
      : null;

  const guestScore = hotelGuestRating != null && Number.isFinite(Number(hotelGuestRating)) ? Number(hotelGuestRating) : null;
  const ratingOutOf100 =
    guestScore != null ? Math.min(100, Math.max(0, Math.round(guestScore * 10))) : null;
  const starFillCount =
    guestScore != null
      ? Math.max(0, Math.min(5, Math.round((guestScore / 10) * 5)))
      : 4;

  return (
    <div className="space-y-6">
      <div>
        <h2 id="hotel-available-rooms-heading" className="text-xl font-bold text-foreground">
          Available rooms & rates
        </h2>
        {showDuffelRateHints ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Select one rate to create a quote, then proceed to payment. Negotiated rates and loyalty programmes follow{" "}
            <a className="text-primary underline" href="https://duffel.com/docs/guides/negotiated-rates" target="_blank" rel="noreferrer">
              Negotiated Rates
            </a>{" "}
            and{" "}
            <a className="text-primary underline" href="https://duffel.com/docs/guides/booking-with-loyalty" target="_blank" rel="noreferrer">
              Booking with Loyalty
            </a>
            .
          </p>
        ) : null}
      </div>
      <div className="space-y-4">
        {totalRoomPages > 1 ? (
          <p className="text-sm text-muted-foreground">
            Showing {(displayRoomPage - 1) * AVAILABLE_ROOMS_PAGE_SIZE + 1}–
            {Math.min(displayRoomPage * AVAILABLE_ROOMS_PAGE_SIZE, rooms.length)} of {rooms.length}{" "}
            {rooms.length === 1 ? "rate" : "rates"}
          </p>
        ) : null}
        {paginatedRooms.map((room) => {
          const quantity = selectedRooms.filter((r) => r.id === room.id).length;
          const isSelected = quantity > 0;
          const cur = room.totalStayCurrency ?? currency;
          const hasStayTotal = Boolean(room.totalStayAmount && room.totalStayCurrency);
          const nights = room.stayNights ?? 1;
          const hasRateConditions = Boolean(room.rateConditions && room.rateConditions.length > 0);
          const hasCancellation =
            showDuffelRateHints && Boolean(room.cancellationTimeline && room.cancellationTimeline.length > 0);
          const hasDuffelNoRefundNote =
            showDuffelRateHints && (!room.cancellationTimeline || room.cancellationTimeline.length === 0);
          const hasExpandablePolicy = hasCancellation || hasDuffelNoRefundNote || hasRateConditions;
          const policyExpanded = expandedPolicyRoomIds.has(room.id);

          const allFeatureStrings = [...room.features.left, ...room.features.right];
          const featureCellIcons = [Clock, Shield, Users, PlaneTakeoff];
          const featureCells: { key: string; label: string; Icon: (typeof featureCellIcons)[number] }[] = [];
          for (let i = 0; i < allFeatureStrings.length && featureCells.length < 4; i++) {
            featureCells.push({
              key: `feat-${i}`,
              label: allFeatureStrings[i],
              Icon: featureCellIcons[featureCells.length % featureCellIcons.length],
            });
          }
          if (featureCells.length < 4 && room.negotiatedRateId) {
            featureCells.push({
              key: "neg",
              label: "Negotiated rate",
              Icon: Shield,
            });
          }
          if (featureCells.length < 4 && room.supportedLoyaltyProgramme) {
            featureCells.push({
              key: "loy",
              label: "Loyalty on rate",
              Icon: Award,
            });
          }
          (room.rateConditions || []).forEach((c, i) => {
            if (featureCells.length >= 4) return;
            const t = c.title + (c.description ? ` · ${c.description}` : "");
            if (t.trim()) {
              featureCells.push({ key: `cond-${i}`, label: t.slice(0, 80), Icon: Sparkles });
            }
          });

          const hasFeatureGrid = featureCells.length > 0;
          const hasExpandableDetails = hasExpandablePolicy || hasFeatureGrid;

          return (
            <article
              key={room.id}
              className={`overflow-hidden rounded-lg border-1 transition-all sm:rounded-xl p-3 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                }`}
            >
              <div className="flex min-h-[128px] w-full min-w-0 flex-row sm:min-h-[150px] lg:items-stretch">
                <div className="relative h-[150px] w-[40%] min-w-24 max-w-[44%] shrink-0 self-start bg-muted sm:h-[150px] sm:w-[35%] sm:min-w-[7.5rem] sm:max-w-[40%] lg:h-auto lg:min-h-[150px] lg:self-stretch">
                  <div className="absolute inset-0">
                    <Image
                      src={room.image}
                      alt={room.name}
                      fill
                      className="object-cover rounded-lg"
                      sizes="(max-width: 640px) 40vw, (max-width: 1024px) 35vw, 280px"
                      unoptimized={shouldUnoptimizeStaysSupplierImage(room.image)}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col px-1.5 sm:px-4">
                  <div className="mb-1.5 flex w-full min-w-0 flex-row items-start justify-between gap-1.5 sm:mb-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex min-w-0 flex-wrap items-start justify-between gap-1.5 sm:mb-1 sm:gap-2">
                        <h3
                          className="min-w-0 pr-0.5 text-sm font-bold leading-snug [color:#2D3748] sm:pr-1 sm:text-lg sm:leading-tight dark:[color:unset]"
                        >
                          {room.name}
                        </h3>
                        <div className="flex max-w-full shrink-0 flex-wrap justify-end gap-1 sm:gap-1.5">
                          {room.negotiatedRateId ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:text-amber-100 sm:text-xs">
                              <BadgePercent className="h-3 w-3 shrink-0" aria-hidden />
                              Negotiated
                            </span>
                          ) : null}
                          {room.supportedLoyaltyProgramme ? (
                            <span className="text-primary inline-flex items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium sm:text-xs">
                              <Award className="h-3 w-3 shrink-0" aria-hidden />
                              Loyalty
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-tight text-[#A0AEC0] sm:mb-2 sm:gap-x-3 sm:gap-y-1 sm:text-xs sm:leading-normal">
                        {checkInLabel ? (
                          <span className="inline-flex min-w-0 items-center gap-0.5 sm:gap-1">
                            <Calendar className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                            {searchStayNights
                              ? `${searchStayNights} night${searchStayNights > 1 ? "s" : ""} · ${checkInLabel}`
                              : checkInLabel}
                          </span>
                        ) : null}
                        {locationLabel ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{locationLabel}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mb-0 flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                        <div className="text-muted-foreground flex shrink-0 items-center">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 sm:h-4 sm:w-4 ${i < starFillCount
                                ? "fill-[#F6AD55] text-[#F6AD55]"
                                : "text-muted-foreground/40"
                                }`}
                              aria-hidden
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">Rating</span>
                        <span className="font-semibold text-primary">
                          {ratingOutOf100 != null ? `${ratingOutOf100} of 100` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex w-[38%] min-w-0 max-w-[44%] shrink-0 flex-col items-end gap-1 self-stretch pl-0.5 sm:w-auto sm:max-w-[16rem] sm:shrink-0 sm:gap-2 sm:pl-0">
                      {showDuffelRateHints && hasStayTotal ? (
                        <div className="w-full min-w-0 text-right sm:w-auto">
                          <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground sm:text-xs sm:leading-normal">
                            Total stay
                          </span>
                          <p className="text-primary break-words text-base font-bold leading-tight sm:text-2xl sm:leading-normal">
                            {formatPrice(Number.parseFloat(room.totalStayAmount!), cur, locale)}
                          </p>
                          {/* <p className="text-[9px] leading-tight text-muted-foreground sm:text-xs sm:leading-normal">
                            {nights} night{nights !== 1 ? "s" : ""}
                          </p> */}
                          <p className="text-muted-foreground mt-0.5 text-[9px] leading-tight sm:text-xs sm:leading-normal">
                            Avg{" "}
                            {formatPrice(
                              Number.parseFloat(room.totalStayAmount!) / Math.max(1, nights),
                              cur,
                              locale,
                            )}{" "}
                            / night
                          </p>
                        </div>
                      ) : (
                        <div className="w-full min-w-0 text-right sm:w-auto">
                          <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground sm:text-xs sm:leading-normal">
                            Per night
                          </span>
                          <p className="text-primary text-base font-bold leading-tight sm:text-3xl sm:leading-normal">
                            {formatPrice(room.pricePerNight, currency, locale)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex w-full  flex-row justify-between gap-1 sm:mt-0 flex-wrap sm:gap-2">
                    <div className="flex flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => togglePolicyExpanded(room.id)}
                        className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
                        aria-expanded={false}
                      >
                        Show more
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomPhotosOpen(roomPhotosOpen === room.id ? null : room.id)}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary hover:underline sm:gap-1.5 sm:text-xs"
                      >
                        <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        Room photos
                      </button>
                    </div>
                    <div className="w-full sm:w-auto flex justify-end">
                      {single ? (
                        isSelected ? (
                          <button
                            type="button"
                            onClick={() => onRemoveRoom(room)}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-card px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2.5 sm:text-sm"
                          >
                            Clear selection
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAddRoom(room)}
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2.5 sm:text-sm"
                          >
                            Select rate
                          </button>
                        )
                      ) : isSelected ? (
                        <div className="flex w-full max-w-full flex-nowrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onRemoveRoom(room)}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted p-1.5 text-foreground hover:bg-muted/80 sm:gap-1.5 sm:rounded-lg sm:px-2 sm:py-1.5"
                            aria-label="Remove one"
                          >
                            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                          <span className="inline-flex min-w-0 max-w-[50%] flex-1 items-center justify-center gap-1 rounded-md bg-primary px-1.5 py-1.5 text-[11px] font-medium text-primary-foreground sm:min-w-[7rem] sm:max-w-none sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm">
                            <Check className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                            {quantity > 1 ? `Selected (${quantity})` : "Selected"}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddRoom(room)}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted p-1.5 text-foreground hover:bg-muted/80 sm:gap-1.5 sm:rounded-lg sm:px-2 sm:py-1.5"
                            aria-label="Add one more"
                          >
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddRoom(room)}
                          className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:w-auto sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 sm:mb-2">
                    {hasExpandableDetails && (
                      policyExpanded ? (
                        <div className="mt-1.5 text-xs sm:mt-2">
                          {hasFeatureGrid ? (
                            <div className="mb-1.5 grid grid-cols-2 gap-1 sm:mb-2 sm:gap-2">
                              {featureCells.slice(0, 4).map(({ key, Icon, label }) => (
                                <div
                                  key={key}
                                  className="flex min-w-0 items-start gap-1 rounded-md bg-[#EDF2F7] px-1 py-0.5 text-[9px] leading-snug text-[#4A5568] sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[11px] dark:bg-muted/80 dark:text-muted-foreground"
                                >
                                  <Icon
                                    className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#4299E1] sm:h-3.5 sm:w-3.5"
                                    strokeWidth={2}
                                    aria-hidden
                                  />
                                  <span className="line-clamp-2 min-w-0">{label}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {showDuffelRateHints && room.cancellationTimeline && room.cancellationTimeline.length > 0 ? (
                            <div className="mb-2 rounded-lg border border-border bg-muted/40 px-2 py-2 sm:px-3">
                              <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                                <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
                                Cancellation (local time)
                              </p>
                              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                                {room.cancellationTimeline.map((step, idx) => (
                                  <li key={`${step.before}-${idx}`}>
                                    Until {formatUtcBeforeLocal(step.before)}: refund{" "}
                                    {formatPrice(Number.parseFloat(step.refund_amount), step.currency ?? cur, locale)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : showDuffelRateHints ? (
                            <p className="text-muted-foreground mb-2 text-[11px] sm:text-xs">
                              No refundable window in the rate data — treat as non-refundable unless your contract
                              says otherwise.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        null
                      )
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalRoomPages > 1 ? (
        <nav
          className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Available rooms pagination"
        >
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Page {displayRoomPage} of {totalRoomPages}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              onClick={() => setRoomListPage((p) => Math.max(1, p - 1))}
              disabled={displayRoomPage <= 1}
              className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {roomPaginationItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="flex h-10 w-10 items-center justify-center">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRoomListPage(item)}
                  className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm ${displayRoomPage === item
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
              onClick={() => setRoomListPage((p) => Math.min(totalRoomPages, p + 1))}
              disabled={displayRoomPage >= totalRoomPages}
              className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border border-input bg-card px-3 text-sm shadow-sm hover:bg-muted disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      ) : null}

      {roomPhotosOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setRoomPhotosOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Room photos"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setRoomPhotosOpen(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl leading-none text-foreground hover:bg-muted/80"
              aria-label="Close"
            >
              ×
            </button>
            {(() => {
              const room = rooms.find((r) => r.id === roomPhotosOpen);
              if (!room) return null;
              const ph = room.photos && room.photos.length > 0 ? room.photos : [room.image];
              return <ImageGallery images={ph} alt={room.name} className="p-4 pt-14" />;
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
