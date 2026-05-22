"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import FlightsTab from "@/components/flights/FlightsTab";
import HotelsTab from "@/components/hotels/HotelsTab";
import { MobileFullscreenSearchOverlay } from "@/components/shared/mobile/MobileFullscreenSearchOverlay";
import { useIsMobile } from "@/components/admin_ui/shared/use-mobile";

export type EditSearchSummaryCardProps = {
  headline: string;
  lines: string[];
  editLabel: string;
  onEdit: () => void;
  /** Explicitly enable flight mobile fullscreen edit (overrides pathname detection). */
  flightMobileFullscreenEdit?: boolean;
  /** Called when a new flight search starts from the mobile edit overlay. */
  onFlightSearchStart?: () => void;
  /** Explicitly enable hotel mobile fullscreen edit (overrides pathname detection). */
  hotelMobileFullscreenEdit?: boolean;
  /** Called when a new stays search starts from the mobile edit overlay. */
  onStaysSearchStart?: () => void;
};

/**
 * Duffel-style compact summary + full-width “Edit search” control for results sidebars.
 */
export function EditSearchSummaryCard({
  headline,
  lines,
  editLabel,
  onEdit,
  flightMobileFullscreenEdit,
  onFlightSearchStart,
  hotelMobileFullscreenEdit,
  onStaysSearchStart,
}: EditSearchSummaryCardProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const tResults = useTranslations("Flights.results");
  const tHotelsResults = useTranslations("Hotels.results");
  const tCommon = useTranslations("Common");
  const [mobileEditOpen, setMobileEditOpen] = useState(false);

  const enableFlightMobileEdit =
    flightMobileFullscreenEdit ?? pathname.includes("/flights");
  const enableHotelMobileEdit =
    hotelMobileFullscreenEdit ?? pathname.includes("/hotels");

  const handleEdit = () => {
    if (isMobile && enableFlightMobileEdit) {
      setMobileEditOpen(true);
      return;
    }
    if (isMobile && enableHotelMobileEdit) {
      setMobileEditOpen(true);
      return;
    }
    onEdit();
  };

  const closeMobileEdit = () => setMobileEditOpen(false);

  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 dark:bg-muted/25">
        <h3 className="text-base font-bold text-foreground">{headline}</h3>
        <div className="mt-2 space-y-1 text-sm text-foreground">
          {lines.map((line, i) => (
            <p key={i} className={i === lines.length - 1 ? "text-muted-foreground" : undefined}>
              {line}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="mt-4 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {editLabel}
        </button>
      </div>

      {isMobile && enableFlightMobileEdit ? (
        <MobileFullscreenSearchOverlay
          open={mobileEditOpen}
          onClose={closeMobileEdit}
          title={tResults("editSearchModalTitle")}
          closeAriaLabel={tCommon("close")}
        >
          <FlightsTab
            variant="modal"
            onFlightSearchStart={() => {
              closeMobileEdit();
              onFlightSearchStart?.();
            }}
          />
        </MobileFullscreenSearchOverlay>
      ) : null}

      {isMobile && enableHotelMobileEdit ? (
        <MobileFullscreenSearchOverlay
          open={mobileEditOpen}
          onClose={closeMobileEdit}
          title={tHotelsResults("editSearchModalTitle")}
          closeAriaLabel={tCommon("close")}
        >
          <HotelsTab
            layout="browse"
            mode
            onStaysSearchStart={() => {
              closeMobileEdit();
              onStaysSearchStart?.();
            }}
          />
        </MobileFullscreenSearchOverlay>
      ) : null}
    </>
  );
}
