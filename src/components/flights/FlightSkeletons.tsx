"use client";

/**
 * Single source of truth for all flight loading skeletons.
 * Import from this file only — do not add parallel skeleton modules under `flights/`.
 *
 * @see FlightsRouteLoadingPicker — route-level hub vs results picker for `flights/loading.tsx`
 */
import { Skeleton } from "@/components/admin_ui/ui/skeleton";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebarSkeleton } from "@/components/shared/BookingSidebar";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** List variant — mirrors {@link FlightResultCard} list layout. */
export function FlightResultListRowSkeleton() {
  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-lg" aria-hidden>
      <div className="flex flex-col justify-between lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center">
            <div className="mr-3 h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted/80" />
            </div>
            <div className="ml-auto h-6 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-2 text-center">
              <div className="mx-auto h-8 w-14 animate-pulse rounded-md bg-muted" />
              <div className="mx-auto h-3 w-24 animate-pulse rounded bg-muted/80" />
            </div>
            <div className="flex-1 px-4">
              <div className="mx-auto mb-2 h-3 w-12 animate-pulse rounded bg-muted/80" />
              <div className="h-1 rounded-full bg-muted" />
            </div>
            <div className="space-y-2 text-center">
              <div className="mx-auto h-8 w-14 animate-pulse rounded-md bg-muted" />
              <div className="mx-auto h-3 w-24 animate-pulse rounded bg-muted/80" />
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="h-4 w-16 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted/80" />
          </div>
        </div>
        <div className="mt-4 shrink-0 border-t pt-4 lg:ml-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="mb-2 text-right">
            <div className="ml-auto h-9 w-28 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 ml-auto h-3 w-36 animate-pulse rounded bg-muted/80" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted md:w-40" />
        </div>
      </div>
    </div>
  );
}

/** Grid variant — mirrors {@link FlightResultCard} grid layout. */
export function FlightResultGridCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-lg"
      aria-hidden
    >
      <div className="mb-2 flex min-w-0 items-center">
        <div className="mr-3 h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-muted/80" />
        </div>
      </div>
      <div className="mb-2 grid grid-cols-3 items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded bg-muted/80" />
        <div className="mx-auto h-4 w-4 animate-pulse rounded bg-muted/80" />
        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted/80" />
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-muted/80" />
        </div>
        <div className="flex flex-col items-center px-2">
          <div className="mb-1 h-3 w-10 animate-pulse rounded bg-muted/80" />
          <div className="h-px w-16 bg-border" />
          <div className="mt-1 h-3 w-12 animate-pulse rounded bg-muted/80" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-5 w-14 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto h-3 w-14 animate-pulse rounded-md bg-muted/80" />
        </div>
      </div>
      <div className="mt-auto border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted/80" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function FlightCardSkeletonTile() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm" aria-hidden>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded-md bg-muted/80" />
          </div>
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <div className="ml-auto h-7 w-16 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto h-3 w-14 animate-pulse rounded-md bg-muted/80" />
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded-md bg-muted/80" />
        </div>
        <div className="flex flex-col items-center px-2">
          <div className="mb-1 h-3 w-10 animate-pulse rounded bg-muted/80" />
          <div className="h-px w-16 bg-border" />
          <div className="mt-1 h-3 w-12 animate-pulse rounded bg-muted/80" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-5 w-14 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto h-3 w-14 animate-pulse rounded-md bg-muted/80" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted/80" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function FlightAirportSuggestRowSkeleton() {
  return (
    <div className="border-b border-border px-4 py-3 last:border-b-0" aria-hidden>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
        <Skeleton className="h-7 w-12 shrink-0 rounded" />
      </div>
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function FlightAirportSuggestSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading airports">
      {Array.from({ length: rows }, (_, i) => (
        <FlightAirportSuggestRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function FlightSeatMapSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/40" />
      </div>
      <div className="min-h-[140px] rounded-lg border border-border/60 bg-muted/30 p-4">
        <div className="mx-auto mb-4 h-4 w-32 animate-pulse rounded bg-muted/60" />
        <div className="mx-auto grid max-w-xs grid-cols-5 gap-2">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FlightResultsFilterSidebarSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm" aria-hidden>
      <div className="space-y-2 rounded-lg border border-border/60 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/80" />
        <div className="mt-3 h-9 w-full animate-pulse rounded-lg bg-muted/60" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/70" />
        ))}
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-2 w-full animate-pulse rounded-full bg-muted/60" />
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

export function FlightListSearchSkeleton({
  rows = 5,
  variant = "list",
}: {
  rows?: number;
  variant?: "list" | "grid";
}) {
  return (
    <div
      className="w-full"
      role="status"
      aria-live="polite"
      aria-label="Loading flight search results"
    >
      {variant === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }, (_, i) => (
            <FlightResultGridCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        Array.from({ length: rows }, (_, i) => <FlightResultListRowSkeleton key={i} />)
      )}
    </div>
  );
}

export function FlightListPageSkeleton({ variant = "list" }: { variant?: "list" | "grid" }) {
  return (
    <div
      className="min-h-screen bg-muted"
      role="status"
      aria-live="polite"
      aria-label="Loading flight results"
    >
      <div className="bg-muted shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-4">
          <div className="h-8 max-w-md animate-pulse rounded-md bg-muted-foreground/15" />
          <div className="mt-2 h-4 max-w-lg animate-pulse rounded bg-muted-foreground/10" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-2 flex flex-col gap-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="h-4 w-40 animate-pulse rounded bg-muted-foreground/10" />
          <div className="hidden h-9 w-20 animate-pulse rounded-lg bg-muted/60 sm:block" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="hidden lg:block lg:w-1/4">
            <FlightResultsFilterSidebarSkeleton />
          </div>
          <div className="lg:w-3/4">
            <FlightListSearchSkeleton rows={variant === "grid" ? 6 : 5} variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search tab
// ---------------------------------------------------------------------------

export function FlightsTabSkeleton({ variant = "page" }: { variant?: "page" | "modal" }) {
  return (
    <div
      className={variant === "page" ? "mx-auto max-w-7xl" : "mx-0 w-full max-w-none"}
      role="status"
      aria-live="polite"
      aria-label="Loading flight search form"
      aria-hidden
    >
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted-foreground/15" />
          ))}
        </div>
      </div>
      <div className="mb-3 flex justify-end">
        <div className="h-[30px] w-full max-w-sm animate-pulse rounded-lg border border-border/60 bg-muted/40" />
      </div>
      <div className="grid grid-cols-1 gap-2 pb-4 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
        </div>
        <div className="md:col-span-5">
          <div className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
        </div>
        <div className="md:col-span-2">
          <div className="h-14 animate-pulse rounded-lg bg-muted/60" />
        </div>
        <div className="md:col-span-4">
          <div className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
        </div>
        <div className="md:col-span-4">
          <div className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
        </div>
        <div className="md:col-span-4">
          <div className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedFlightsGridSkeleton() {
  return (
    <div
      className="grid min-h-[280px] grid-cols-1 gap-4 md:grid-cols-2"
      role="status"
      aria-live="polite"
      aria-label="Loading featured flight deals"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <FlightCardSkeletonTile key={i} />
      ))}
    </div>
  );
}

export function FeaturedFlightsSectionFallback({ bgColor = "bg-muted/40" }: { bgColor?: string }) {
  return (
    <section className={`py-10 ${bgColor}`} role="status" aria-live="polite" aria-label="Loading featured flights">
      <div className="container mx-auto px-4 md:px-10">
        <div className="mb-6 md:mb-6">
          <div className="mb-2 h-8 max-w-xs animate-pulse rounded-md bg-muted-foreground/15" />
          <div className="h-4 max-w-md animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="min-h-[280px] animate-pulse rounded-2xl bg-muted/60" />
          </div>
          <div className="lg:col-span-2">
            <FeaturedFlightsGridSkeleton />
          </div>
        </div>
      </div>
    </section>
  );
}

export function FlightsHubPageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading flights" className="md:relative">
      <div
        id="flight-search"
        className="scroll-mt-16 bg-muted px-4 pt-10 md:absolute md:inset-x-0 md:z-20 md:container md:mx-auto md:-mt-36 md:max-w-7xl md:px-4 md:pt-0 md:pb-6 md:rounded-xl md:bg-background md:shadow-xl md:border md:border-border/50 md:p-6"
      >
        <FlightsTabSkeleton variant="page" />
      </div>
      <div className="md:pt-48">
        <FeaturedFlightsSectionFallback bgColor="bg-muted/40" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export function FlightDetailContentSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div>
        <div className="h-8 max-w-md animate-pulse rounded-md bg-muted-foreground/15 md:h-9 md:max-w-xl" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="h-4 w-36 animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-7 w-20 animate-pulse rounded-lg bg-amber-400/35" />
        </div>
      </div>
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
      <div className="border-t border-border pb-2 pt-4 md:pt-8">
        <div className="mb-2 h-7 max-w-xs animate-pulse rounded-md bg-muted-foreground/15 md:mb-4 md:max-w-sm" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-[96%] animate-pulse rounded bg-muted-foreground/10" />
          <div className="h-4 w-[88%] animate-pulse rounded bg-muted-foreground/10" />
        </div>
      </div>
      <div className="border-t border-border pt-8">
        <div className="mb-2 h-7 max-w-xs animate-pulse rounded-md bg-muted-foreground/15 md:max-w-md" />
        <div className="mb-4 h-4 w-full max-w-lg animate-pulse rounded bg-muted-foreground/10" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
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

function FlightChangeBreadcrumbSkeleton() {
  return (
    <nav aria-hidden className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted-foreground/15" />
        ))}
      </div>
    </nav>
  );
}

function FlightChangeModeBannerSkeleton() {
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3" aria-hidden>
      <div className="h-4 w-64 animate-pulse rounded bg-muted-foreground/15" />
    </div>
  );
}

export function FlightChangeDetailLoading() {
  return (
    <div
      className="container mx-auto px-4 py-8 md:py-12"
      role="status"
      aria-live="polite"
      aria-label="Loading change flight details"
    >
      <FlightChangeBreadcrumbSkeleton />
      <FlightChangeModeBannerSkeleton />
      <FlightDetailLoading />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export function CheckoutLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4" role="status" aria-live="polite" aria-label="Loading checkout">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted-foreground/20" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted-foreground/15" />
        </div>
        <div className="h-4 w-28 animate-pulse rounded bg-muted-foreground/15" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 lg:col-span-2">
          <div className="min-h-[280px] rounded-2xl border border-border bg-card/60 p-6 shadow-sm md:p-8">
            <div className="mb-6 h-7 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="space-y-4">
              <div className="h-36 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm dropdown-scrollbar max-h-[calc(100vh-6rem)]">
            <div className="h-14 animate-pulse bg-muted" />
            <div className="space-y-4 p-6">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
              <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlightCheckoutPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="flex-grow pt-12 pb-12 sm:px-4">
        <CheckoutLoadingSkeleton />
      </div>
    </div>
  );
}

export function FlightChangeConfirmPaySkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted-foreground/10" />
          <div className="ml-auto h-8 w-28 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border/40 px-4 py-3">
          <div className="h-5 w-40 animate-pulse rounded bg-muted-foreground/15" />
        </div>
        <div className="space-y-4 p-4">
          <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
        </div>
      </div>
      <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
    </div>
  );
}

export function FlightChangePaymentLoading() {
  return (
    <div
      className="flex min-h-screen flex-col bg-muted"
      role="status"
      aria-live="polite"
      aria-label="Loading change payment"
    >
      <div className="flex-grow pt-12 pb-12 sm:px-4">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <FlightChangeBreadcrumbSkeleton />
          <DetailPageLayout
            mainContent={<FlightChangeConfirmPaySkeleton />}
            sidebarContent={<BookingSidebarSkeleton />}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change flow
// ---------------------------------------------------------------------------

export function FlightChangeHubLoading() {
  return (
    <div
      className="container mx-auto px-4 py-8 md:py-12"
      role="status"
      aria-live="polite"
      aria-label="Loading flight change"
    >
      <FlightChangeBreadcrumbSkeleton />
      <div className="mb-6 h-8 max-w-md animate-pulse rounded-md bg-muted-foreground/15" />
      <FlightChangeModeBannerSkeleton />
      <div className="mt-6">
        <FlightsTabSkeleton variant="page" />
      </div>
    </div>
  );
}

export function FlightChangeRedirectLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Redirecting"
    >
      <div className="h-8 w-8 animate-pulse rounded-full bg-primary/30" aria-hidden />
    </div>
  );
}
