"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ApiRequestError } from "@/lib/http/api-client";
import {
  getStaysBookingCancelPreview,
  postStaysBookingCancel,
  postStaysBookingRefundRetry,
  type StaysCancelPreviewDto,
} from "@/lib/http/stays.client";

type CancellationRow = {
  id: string;
  status: string;
  refund_amount: string | null;
  refund_currency: string | null;
  customer_refund_amount: string | null;
  customer_refund_currency: string | null;
  confirmed_at: string | null;
};

type Props = {
  bookingId: string;
  bookingRefNo: string;
  hotelConfirmation?: string | null;
  status: string;
  paymentStatus: string;
  hasDuffelBooking: boolean;
  cancellations?: CancellationRow[];
  onBookingRefresh?: () => Promise<void>;
  embedded?: boolean;
  onActionsReady?: (actions: { openPreview: () => void; busy: boolean }) => void;
};

export function HotelBookingCancelPanel({
  bookingId,
  bookingRefNo,
  hotelConfirmation,
  status,
  paymentStatus,
  hasDuffelBooking,
  cancellations,
  onBookingRefresh,
  embedded = false,
  onActionsReady,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Hotels.bookingDetail");
  const tMoney = useTranslations("BookingMoney");
  const { formatPrice } = useCurrency();

  const [modalOpen, setModalOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [preview, setPreview] = useState<StaysCancelPreviewDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRefund, setSuccessRefund] = useState<{ amount: number; currency: string } | null>(null);

  const latestCancel = cancellations?.find((c) => c.status === "confirmed") ?? cancellations?.[0];

  const openPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await getStaysBookingCancelPreview(bookingId);
      setPreview(data);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("cancelPreviewError"));
    } finally {
      setBusy(false);
    }
  }, [bookingId, t]);

  const confirmCancel = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await postStaysBookingCancel(bookingId);
      setModalOpen(false);
      setPreview(null);
      if (preview?.refundAmount && preview.refundCurrency) {
        const n = Number.parseFloat(preview.refundAmount);
        if (Number.isFinite(n)) {
          setSuccessRefund({ amount: n, currency: preview.refundCurrency.toUpperCase() });
        }
      }
      setSuccessOpen(true);
      await onBookingRefresh?.();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("cancelConfirmError"));
    } finally {
      setBusy(false);
    }
  }, [bookingId, onBookingRefresh, preview, t]);

  const retryRefund = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await postStaysBookingRefundRetry(bookingId);
      await onBookingRefresh?.();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : tMoney("cancelRefundFailed"));
    } finally {
      setBusy(false);
    }
  }, [bookingId, onBookingRefresh, tMoney]);

  useEffect(() => {
    onActionsReady?.({ openPreview: () => void openPreview(), busy });
  }, [onActionsReady, openPreview, busy]);

  if (!hasDuffelBooking) return null;

  const showCancelCta = status === "confirmed";
  const showRefundRetry = status === "cancelled" && paymentStatus === "refund_failed";
  const showRefundPending =
    status === "cancelled" &&
    (paymentStatus === "refund_processing" || paymentStatus === "refund_pending");
  const showRefundComplete =
    status === "cancelled" &&
    (paymentStatus === "refunded" ||
      paymentStatus === "partially_refunded");

  if (!showCancelCta && !showRefundRetry && !showRefundPending && !showRefundComplete && !embedded) {
    return null;
  }

  const refundLabel =
    preview?.refundAmount && preview.refundCurrency
      ? formatPrice(
          Number.parseFloat(String(preview.refundAmount)),
          preview.refundCurrency.toUpperCase(),
          locale,
        )
      : preview?.nonRefundable
        ? formatPrice(0, (preview.refundCurrency ?? "USD").toUpperCase(), locale)
        : null;

  const cancelTitleRef = hotelConfirmation ?? bookingRefNo;

  return (
    <>
      {!embedded ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("cancelSectionTitle")}
          </h2>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

          {showCancelCta ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{t("cancelSectionIntro")}</p>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void openPreview()}>
                {busy ? (
                  <>
                    <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                    <span className="ml-2">{t("cancelLoading")}</span>
                  </>
                ) : (
                  t("cancelButton")
                )}
              </Button>
            </div>
          ) : null}

      {showRefundComplete ? (
        <CancelledRefundState
          paymentStatus={paymentStatus}
          latestCancel={latestCancel}
          tMoney={tMoney}
          tDetail={t}
          locale={locale}
          formatPrice={formatPrice}
        />
      ) : null}

          {showRefundPending ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">{tMoney("cancelRefundProcessing")}</p>
            </div>
          ) : null}

          {showRefundRetry ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-destructive">{tMoney("cancelRefundFailed")}</p>
              <Button type="button" variant="primary" disabled={busy} onClick={() => void retryRefund()}>
                {busy ? t("cancelLoading") : tMoney("cancelRefundRetry")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : embedded && (showRefundRetry || showRefundPending || showRefundComplete || error) ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("cancelSectionTitle")}
          </h2>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {showRefundComplete ? (
        <CancelledRefundState
          paymentStatus={paymentStatus}
          latestCancel={latestCancel}
          tMoney={tMoney}
          tDetail={t}
          locale={locale}
          formatPrice={formatPrice}
        />
      ) : null}
          {showRefundPending ? (
            <p className="mt-2 text-sm text-muted-foreground">{tMoney("cancelRefundProcessing")}</p>
          ) : null}
          {showRefundRetry ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-destructive">{tMoney("cancelRefundFailed")}</p>
              <Button type="button" variant="primary" disabled={busy} onClick={() => void retryRefund()}>
                {tMoney("cancelRefundRetry")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
            setPreview(null);
          }
        }}
        title={t("cancelModalTitle", { ref: cancelTitleRef })}
      >
        {preview ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">{t("cancelModalIntro")}</p>
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
              {t("cancelModalIrreversible")}
            </p>
            {refundLabel ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                <dt className="text-muted-foreground">{t("cancelRefundEstimate")}</dt>
                <dd className="font-semibold text-foreground">{refundLabel}</dd>
              </dl>
            ) : null}
            <p className="text-xs text-muted-foreground">{preview.policySummary}</p>
            <p className="text-xs text-muted-foreground">{t("cancelRefundTiming")}</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setModalOpen(false);
                  setPreview(null);
                }}
              >
                {t("modalDismiss")}
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmCancel()}>
                {busy ? (
                  <>
                    <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                    <span className="ml-2">{t("cancelLoading")}</span>
                  </>
                ) : (
                  t("cancelConfirmButton")
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          setSuccessRefund(null);
        }}
        title={t("cancelSuccessTitle")}
        className="max-w-md"
      >
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="font-medium text-foreground">{t("cancelSuccessHeading")}</p>
              <p className="mt-1 text-muted-foreground">{t("cancelSuccessBody")}</p>
            </div>
          </div>
          <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
            <dt className="text-muted-foreground">{t("ttuRefLabel")}</dt>
            <dd className="font-semibold text-foreground">{bookingRefNo}</dd>
            {successRefund ? (
              <>
                <dt className="text-muted-foreground">{t("cancelRefundEstimate")}</dt>
                <dd className="font-semibold text-foreground">
                  {formatPrice(successRefund.amount, successRefund.currency, locale)}
                </dd>
              </>
            ) : null}
          </dl>
          <p className="text-muted-foreground">{t("cancelSuccessRefundNote")}</p>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setSuccessOpen(false);
                setSuccessRefund(null);
              }}
            >
              {t("modalClose")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CancelledRefundState({
  paymentStatus,
  latestCancel,
  tMoney,
  tDetail,
  locale,
  formatPrice,
}: {
  paymentStatus: string;
  latestCancel?: CancellationRow;
  tMoney: ReturnType<typeof useTranslations<"BookingMoney">>;
  tDetail: ReturnType<typeof useTranslations<"Hotels.bookingDetail">>;
  locale: string;
  formatPrice: (n: number, c: string, l: string) => string;
}) {
  const refundAmt = latestCancel?.customer_refund_amount ?? latestCancel?.refund_amount;
  const refundCur = latestCancel?.customer_refund_currency ?? latestCancel?.refund_currency;

  return (
    <div className="mt-3 space-y-1">
      <p className="text-sm font-medium text-foreground">
        {tMoney.has(`paymentStatusLabel.${paymentStatus}`)
          ? tMoney(`paymentStatusLabel.${paymentStatus}` as "paymentStatusLabel.refunded")
          : paymentStatus.replace(/_/g, " ")}
      </p>
      {refundAmt && refundCur ? (
        <p className="text-sm text-muted-foreground">
          {tDetail("cancelRefundApplied")}{" "}
          {formatPrice(Number.parseFloat(refundAmt), refundCur.toUpperCase(), locale)}
        </p>
      ) : null}
      {tMoney.has(`paymentStatusHint.${paymentStatus}`) ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {tMoney(`paymentStatusHint.${paymentStatus}` as "paymentStatusHint.refunded")}
        </p>
      ) : null}
    </div>
  );
}

export function HotelPaymentSummary({ guestData }: { guestData: unknown }) {
  if (!guestData || typeof guestData !== "object") return null;
  const g = guestData as Record<string, unknown>;
  const charge = g.customer_charge as { amount?: string; currency?: string } | undefined;
  const pi = g.stripe_payment_intent_id;
  if (!charge?.amount && typeof pi !== "string") return null;
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Payments & refunds
      </h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {charge?.amount && charge.currency ? (
          <>
            <dt className="text-muted-foreground">Charged</dt>
            <dd className="font-medium">
              {charge.currency} {charge.amount}
            </dd>
          </>
        ) : null}
        {typeof pi === "string" ? (
          <>
            <dt className="text-muted-foreground">Payment reference</dt>
            <dd className="break-all font-mono text-xs">{pi}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
