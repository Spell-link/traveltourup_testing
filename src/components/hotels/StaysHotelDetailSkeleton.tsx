"use client";

import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebarSkeleton } from "@/components/shared/BookingSidebar";
import { ReviewsSectionSkeleton } from "@/components/flights/FlightSkeletons";
import { HotelDetailContentSkeleton } from "@/components/hotels/HotelDetailContentSkeleton";

/** Full stays hotel detail layout while rates load (matches StaysHotelDetail + HotelDetailContent). */
export function StaysHotelDetailLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading hotel details">
      <DetailPageLayout
        mainContent={
          <>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <div className="h-10 w-36 animate-pulse rounded-lg bg-muted-foreground/15" />
            </div>
            <HotelDetailContentSkeleton />
          </>
        }
        sidebarContent={<BookingSidebarSkeleton />}
        bottomContent={<ReviewsSectionSkeleton />}
      />
    </div>
  );
}
