"use client";

import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { FlightDetailContentSkeleton } from "@/components/flights/FlightSkeletons";

function FlightOrderSummarySidebarSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-hidden>
      <div className="border-b border-border bg-muted px-6 py-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted-foreground/15" />
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-muted-foreground/15" />
            <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/10" />
          </div>
        ))}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <div className="h-3 w-12 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}

function BookingDetailCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-hidden>
      <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/15" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </section>
  );
}

function GenericBookingDetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-6 w-16 animate-pulse rounded-full bg-primary/15" />
      <div className="h-8 max-w-lg animate-pulse rounded-md bg-muted-foreground/15" />
      <div className="h-4 max-w-md animate-pulse rounded bg-muted-foreground/10" />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="h-4 w-16 animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted/50" />
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted-foreground/20" />
        </section>
      </div>
      <BookingDetailCardSkeleton lines={4} />
    </div>
  );
}

/**
 * Mirrors {@link FlightOrderDetailView} — header row + {@link DetailPageLayout} with itinerary and summary sidebar.
 */
export function FlightOrderDetailSkeleton() {
  return (
    <div className="-mx-2 sm:mx-0">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 pb-0 md:p-8 md:pb-0">
        <div className="space-y-2">
          <div className="h-8 max-w-xs animate-pulse rounded-md bg-muted-foreground/15 md:max-w-sm" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted-foreground/10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-10 w-32 animate-pulse rounded-lg border border-border bg-card" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>

      <DetailPageLayout
        mainContent={
          <div className="space-y-6">
            <section>
              <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted-foreground/15" />
              <FlightDetailContentSkeleton />
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              <BookingDetailCardSkeleton lines={2} />
              <BookingDetailCardSkeleton lines={2} />
            </div>
            <BookingDetailCardSkeleton lines={3} />
            <BookingDetailCardSkeleton lines={2} />
          </div>
        }
        sidebarContent={<FlightOrderSummarySidebarSkeleton />}
      />
    </div>
  );
}

/**
 * Profile / admin booking detail loading shell while `GET /api/v1/bookings/:id` resolves.
 */
export function BookingDetailLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading booking details">
      <FlightOrderDetailSkeleton />
    </div>
  );
}

export { GenericBookingDetailSkeleton };
