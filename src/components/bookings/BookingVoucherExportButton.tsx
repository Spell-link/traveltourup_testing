"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { hotelConfirmationDownloadFilename } from "@/lib/hotels/confirmation-pdf.constants";
import { downloadBookingVoucherPdf } from "@/lib/http/bookings.client";

type Props = {
  bookingId: string;
  bookingRefNo: string;
  /** When true, GET /voucher can build the PDF on demand (same as flight itinerary export). */
  canExport: boolean;
};

const exportButtonClass =
  "border-border bg-card text-foreground hover:bg-muted";

export function BookingVoucherExportButton({ bookingId, bookingRefNo, canExport }: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadBookingVoucherPdf(
        bookingId,
        hotelConfirmationDownloadFilename(bookingRefNo),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportError"));
    } finally {
      setDownloading(false);
    }
  }, [bookingId, bookingRefNo, t]);

  if (!canExport) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        aria-busy="true"
        aria-label={t("exportPreparingAria")}
        className={exportButtonClass}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("exportPreparing")}
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
        aria-label={downloading ? t("exportDownloadingAria") : t("exportButtonAria")}
        className={exportButtonClass}
        onClick={() => void onExport()}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("exportDownloading")}
          </>
        ) : (
          <>
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            {t("exportButton")}
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
