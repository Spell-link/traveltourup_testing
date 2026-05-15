"use client";

import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebarSkeleton } from "@/components/shared/BookingSidebar";

/**
 * Mirrors {@link FlightDetailContent}: `space-y-8`, route title row, takeoff/duration/landing strip,
 * {@link DetailKeyGrid} (8 × icon + label + value), about block, {@link DetailFeaturesGrid} shell.
 */
export function FlightDetailContentSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      {/* Title + badges — matches FlightDetailContent header block */}
      <div>
        <div className="h-8 max-w-md animate-pulse rounded-md bg-muted-foreground/15 md:h-9 md:max-w-xl" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="h-4 w-36 animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-7 w-20 animate-pulse rounded-lg bg-amber-400/35" />
        </div>
      </div>

      {/* Takeoff | duration | landing — matches `py-6 border-y` + `grid-cols-3` */}
      <div className="border-y border-border py-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto h-3.5 w-28 animate-pulse rounded bg-muted-foreground/15" />
            <div className="mx-auto h-4 w-40 animate-pulse rounded bg-muted-foreground/10" />
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-muted-foreground/10" />
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-primary/25" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-muted-foreground/15" />
          </div>
          <div className="space-y-2">
            <div className="mx-auto h-3.5 w-28 animate-pulse rounded bg-muted-foreground/15" />
            <div className="mx-auto h-4 w-40 animate-pulse rounded bg-muted-foreground/10" />
            <div className="mx-auto h-3 w-32 animate-pulse rounded bg-muted-foreground/10" />
          </div>
        </div>
        <div className="mx-auto mt-4 h-4 w-48 animate-pulse rounded bg-muted-foreground/12" />
      </div>

      {/* DetailKeyGrid — `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3`, 8 items */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-primary/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-muted-foreground/15" />
              <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>

      {/* About airline — matches border-t section */}
      <div className="border-t border-border pt-4 pb-2 md:pt-8">
        <div className="mb-2 h-7 max-w-xs animate-pulse rounded-md bg-muted-foreground/15 md:mb-4 md:max-w-sm" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-[96%] animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-[88%] animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-[72%] animate-pulse rounded bg-muted-foreground/10 md:hidden" />
        </div>
      </div>

      {/* DetailFeaturesGrid — title + description + `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` */}
      <div className="border-t border-border pt-8">
        <div className="mb-2 h-7 max-w-xs animate-pulse rounded-md bg-muted-foreground/15 md:max-w-md" />
        <div className="mb-4 h-4 w-full max-w-lg animate-pulse rounded bg-muted-foreground/10" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
            >
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-primary/10" />
              <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReviewsSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-hidden>
      <div className="mb-6 h-8 max-w-xs animate-pulse rounded-md bg-muted-foreground/15" />
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="border-b border-border pb-4 last:border-0">
            <div className="mb-2 flex gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/15" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted-foreground/10" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/10" />
            <div className="mt-2 h-3 max-w-[95%] animate-pulse rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full flight detail shell while the offer loads.
 * Matches {@link FlightDetail}: wishlist row + {@link FlightDetailContent}; no reviews block (flight detail omits `bottomContent`).
 */
export function FlightDetailLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading flight details">
      <DetailPageLayout
        mainContent={
          <>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <div className="h-10 w-36 animate-pulse rounded-lg bg-muted-foreground/15" aria-hidden />
            </div>
            <FlightDetailContentSkeleton />
          </>
        }
        sidebarContent={<BookingSidebarSkeleton />}
      />
    </div>
  );
}
