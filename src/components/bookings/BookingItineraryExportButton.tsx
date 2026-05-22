"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { flightItineraryDownloadFilename } from "@/lib/flights/itinerary-pdf.constants";
import { downloadBookingItineraryPdf } from "@/lib/http/bookings.client";

type Props = {
  bookingId: string;
  bookingRefNo: string;
  ticketReady: boolean;
};

const exportButtonClass =
  "border-border bg-card text-foreground hover:bg-muted";

export function BookingItineraryExportButton({ bookingId, bookingRefNo, ticketReady }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadBookingItineraryPdf(
        bookingId,
        flightItineraryDownloadFilename(bookingRefNo),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download itinerary");
    } finally {
      setDownloading(false);
    }
  }, [bookingId, bookingRefNo]);

  if (!ticketReady) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        aria-busy="true"
        aria-label="Preparing itinerary PDF"
        className={exportButtonClass}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Preparing itinerary…
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={downloading}
        aria-busy={downloading}
        aria-label={downloading ? "Downloading itinerary PDF" : "Export itinerary PDF"}
        className={exportButtonClass}
        onClick={() => void onExport()}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Downloading…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Export itinerary
          </>
        )}
      </Button>
      {error ? (
        <p className="text-xs text-destructive sm:text-right" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
