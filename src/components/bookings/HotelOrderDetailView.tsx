"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BookingVoucherExportButton } from "@/components/bookings/BookingVoucherExportButton";
import { BookingHotelAdditionalSection } from "@/components/bookings/BookingHotelAdditionalSection";
import { BookingHotelContactSection } from "@/components/bookings/BookingHotelContactSection";
import { BookingHotelGuestsSection } from "@/components/bookings/BookingHotelGuestsSection";
import { BookingFinancialTimelinePanel } from "@/components/bookings/BookingFinancialTimelinePanel";
import { BookingHotelPolicyCards } from "@/components/bookings/BookingHotelPolicyCards";
import { BookingHotelStayDetail } from "@/components/bookings/BookingHotelStayDetail";
import { HotelBookingCancelPanel } from "@/components/bookings/HotelBookingCancelPanel";
import { HotelChangeDatesModal } from "@/components/bookings/HotelChangeDatesModal";
import { HotelManageBookingMenu } from "@/components/bookings/HotelManageBookingMenu";
import { HotelSpecialRequestModal } from "@/components/bookings/HotelSpecialRequestModal";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { HotelOrderBillingSummary } from "@/components/hotels/HotelOrderBillingSummary";
import { HotelOrderSummarySidebar } from "@/components/hotels/HotelOrderSummarySidebar";
import { Button } from "@/components/ui/Button";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import { postBookingVoucherRegenerate } from "@/lib/http/bookings.client";
import {
  parseStaysBookingDisplay,
  type StaysCheckoutPaymentSnapshot,
} from "@/lib/stays/stays-booking-display";

type HotelBookingDetail = NonNullable<BookingDetailDto["hotel_booking"]> & {
  voucher_ready?: boolean;
  voucher_generated_at?: string | null;
  voucher_generation_failed?: boolean;
};

function canExportHotelVoucher(hb: HotelBookingDetail): boolean {
  return Boolean(hb.stays_raw ?? hb.accommodation_snapshot);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function HotelOrderDetailView({
  row,
  bookingId,
  showAdminVoucherTools,
  paymentStatusLabel,
  onRefresh,
}: {
  row: BookingDetailDto;
  bookingId: string;
  showAdminVoucherTools?: boolean;
  paymentStatusLabel?: string;
  onRefresh: () => Promise<void>;
}) {
  const locale = useLocale();
  const t = useTranslations("Hotels.bookingDetail");
  const hb = row.hotel_booking as HotelBookingDetail | null;

  const [regBusy, setRegBusy] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [cancelOpenPreview, setCancelOpenPreview] = useState<(() => void) | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const registerCancelActions = useCallback((actions: { openPreview: () => void; busy: boolean }) => {
    setCancelOpenPreview(() => actions.openPreview);
    setCancelBusy(actions.busy);
  }, []);

  const pricingBreakdown = (row as { pricing_breakdown?: StaysCheckoutPaymentSnapshot | null })
    .pricing_breakdown;

  const display = useMemo(
    () =>
      hb
        ? parseStaysBookingDisplay({
            staysRaw: hb.stays_raw,
            accommodationSnapshot: hb.accommodation_snapshot,
            guestData: row.guest_data,
            bookingReference: hb.booking_reference,
            duffelBookingId: hb.duffel_booking_id,
            totalAmount: String(row.total_amount),
            totalCurrency: row.currency,
            createdAt: row.created_at,
            status: row.status,
            checkoutPayment: pricingBreakdown ?? null,
          })
        : null,
    [
      hb,
      row.guest_data,
      row.total_amount,
      row.currency,
      row.created_at,
      row.status,
      pricingBreakdown,
    ],
  );

  if (!hb || !display) return null;

  const isConfirmed = row.status === "confirmed";
  const isCancelled = row.status === "cancelled";
  const canCancel = isConfirmed && Boolean(hb.duffel_booking_id);
  const canManage = isConfirmed;
  const canExportPdf = canExportHotelVoucher(hb);

  const pageTitle = display.bookingReference ?? row.booking_ref_no;
  const pageSubtitle = display.duffelBookingId
    ? t("duffelBookingIdSubtitle", { id: display.duffelBookingId })
    : null;

  const handleCopyRef = async () => {
    const text = display.bookingReference ?? row.booking_ref_no;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  return (
    <div className="-mx-2 sm:mx-0">
      {isCancelled ? (
        <div className="mx-4 mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/30 md:mx-8">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="font-medium text-foreground">{t("cancelledBannerTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("cancelledBannerBody")}</p>
          </div>
        </div>
      ) : null}

      {display.limitedDetails ? (
        <div className="mx-4 mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 md:mx-8">
          <p className="text-sm text-amber-900 dark:text-amber-200">{t("limitedDetailsBanner")}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4 p-4 pb-0 md:p-8 md:pb-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">{pageTitle}</h1>
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => void handleCopyRef()}
              aria-label={copiedRef ? t("copied") : t("copyRefAria")}
            >
              {copiedRef ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {pageSubtitle ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{pageSubtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingVoucherExportButton
            bookingId={bookingId}
            bookingRefNo={row.booking_ref_no}
            canExport={canExportPdf}
          />
          {canManage ? (
            <HotelManageBookingMenu
              canSpecialRequest
              canChangeDates
              canCancel={canCancel}
              onSpecialRequest={() => setSpecialOpen(true)}
              onChangeDates={() => setChangeOpen(true)}
              onRequestCancel={() => cancelOpenPreview?.()}
              cancelBusy={cancelBusy}
            />
          ) : null}
        </div>
      </div>

      <DetailPageLayout
        mainContent={
          <div className="space-y-6">
            <BookingHotelStayDetail display={display} />
            <BookingHotelPolicyCards display={display} />
            <BookingHotelGuestsSection display={display} />
            <BookingHotelContactSection display={display} />
            <BookingHotelAdditionalSection display={display} />
            <HotelOrderBillingSummary billing={display.billing} paidAt={display.confirmedAt} />

            {!hb.voucher_ready && canExportPdf && !hb.voucher_generation_failed ? (
              <p className="text-sm text-muted-foreground">{t("voucherOnDemandHint")}</p>
            ) : null}
            {hb.voucher_generation_failed && !canExportPdf ? (
              <p className="text-sm text-destructive">{t("voucherFailed")}</p>
            ) : null}
            {showAdminVoucherTools ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={regBusy}
                onClick={() => {
                  void (async () => {
                    setRegBusy(true);
                    try {
                      await postBookingVoucherRegenerate(bookingId);
                      await onRefresh();
                    } finally {
                      setRegBusy(false);
                    }
                  })();
                }}
              >
                {regBusy ? t("regeneratingVoucher") : t("regenerateVoucher")}
              </Button>
            ) : null}

            <HotelBookingCancelPanel
              bookingId={bookingId}
              bookingRefNo={row.booking_ref_no}
              hotelConfirmation={display.bookingReference}
              status={row.status}
              paymentStatus={row.payment_status}
              hasDuffelBooking={Boolean(hb.duffel_booking_id)}
              cancellations={hb.cancellations}
              onBookingRefresh={onRefresh}
              embedded={isConfirmed}
              onActionsReady={isConfirmed ? registerCancelActions : undefined}
            />

            <BookingFinancialTimelinePanel bookingId={bookingId} productType="hotel" />
          </div>
        }
        sidebarContent={
          <HotelOrderSummarySidebar
            bookingRefNo={row.booking_ref_no}
            status={row.status}
            paymentStatus={row.payment_status}
            paymentStatusLabel={paymentStatusLabel}
            display={display}
            totalAmount={display.billing.totalPaidAmount ?? display.billing.totalAmount}
            currency={display.billing.totalPaidCurrency ?? display.billing.totalCurrency}
          />
        }
      />

      <HotelSpecialRequestModal
        open={specialOpen}
        onClose={() => setSpecialOpen(false)}
        display={display}
        locale={locale}
      />
      <HotelChangeDatesModal open={changeOpen} onClose={() => setChangeOpen(false)} />
    </div>
  );
}
