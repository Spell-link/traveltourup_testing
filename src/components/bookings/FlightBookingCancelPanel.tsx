"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLocale, useTranslations } from "next-intl";
import {
  getFlightBookingCancelStatus,
  postFlightBookingCancel,
  postFlightBookingRefundRetry,
} from "@/lib/http/flights.client";

type OrderCancellationQuote = {
  order_cancellation_id: string;
  order_id?: string;
  status?: string;
  refund_amount?: string | null;
  refund_currency?: string | null;
  refund_to?: string | null;
  quote_expires_at?: string | null;
  confirmed_at?: string | null;
};

type CancellationSuccessPayload = {
  bookingRefNo: string;
  refundDisplay: { amount: number; currency: string } | null;
  refundToHuman: string;
  isCredits: boolean;
  confirmedAtLabel: string | null;
};

function parseOrderCancellation(raw: Record<string, unknown>): OrderCancellationQuote | null {
  const id = raw.order_cancellation_id;
  if (typeof id !== "string" || !id) return null;
  return {
    order_cancellation_id: id,
    order_id: typeof raw.order_id === "string" ? raw.order_id : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    refund_amount:
      typeof raw.refund_amount === "string"
        ? raw.refund_amount
        : typeof raw.refund_amount === "number"
          ? String(raw.refund_amount)
          : null,
    refund_currency: typeof raw.refund_currency === "string" ? raw.refund_currency : null,
    refund_to: typeof raw.refund_to === "string" ? raw.refund_to : null,
    quote_expires_at: typeof raw.quote_expires_at === "string" ? raw.quote_expires_at : null,
    confirmed_at: typeof raw.confirmed_at === "string" ? raw.confirmed_at : null,
  };
}

function bookingRefFromResponse(booking: Record<string, unknown> | undefined, fallback: string): string {
  const v = booking?.booking_ref_no;
  return typeof v === "string" && v.trim() ? v : fallback;
}

function buildSuccessPayload(
  oc: OrderCancellationQuote,
  bookingRefNo: string,
): CancellationSuccessPayload {
  const isCredits = oc.refund_to === "airline_credits";
  const refundToHuman =
    oc.refund_to?.replace(/_/g, " ") ?? (isCredits ? "airline credits" : "original payment method");
  let refundDisplay: { amount: number; currency: string } | null = null;
  if (oc.refund_amount && oc.refund_currency) {
    const n = Number.parseFloat(String(oc.refund_amount));
    if (Number.isFinite(n)) {
      refundDisplay = { amount: n, currency: oc.refund_currency.toUpperCase() };
    }
  }
  let confirmedAtLabel: string | null = null;
  if (oc.confirmed_at) {
    try {
      confirmedAtLabel = new Date(oc.confirmed_at).toLocaleString();
    } catch {
      confirmedAtLabel = oc.confirmed_at;
    }
  }
  return {
    bookingRefNo,
    refundDisplay,
    refundToHuman,
    isCredits,
    confirmedAtLabel,
  };
}

export function FlightBookingCancelPanel({
  bookingId,
  bookingRefNo,
  status,
  paymentStatus,
  hasDuffelOrder,
  onBookingRefresh,
  embedded = false,
  onActionsReady,
}: {
  bookingId: string;
  bookingRefNo: string;
  status: string;
  paymentStatus: string;
  hasDuffelOrder: boolean;
  onBookingRefresh: () => Promise<void>;
  /** When true, hide section chrome; use Manage menu to open quote. */
  embedded?: boolean;
  onActionsReady?: (actions: { openQuote: () => void; busy: boolean }) => void;
}) {
  const locale = useLocale();
  const tMoney = useTranslations("BookingMoney");
  const { formatPrice } = useCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState<CancellationSuccessPayload | null>(null);
  const [quote, setQuote] = useState<OrderCancellationQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCancellationSuccess = useCallback((oc: OrderCancellationQuote, refNo: string) => {
    setSuccessPayload(buildSuccessPayload(oc, refNo));
    setSuccessOpen(true);
  }, []);

  const openQuote = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postFlightBookingCancel(bookingId, { action: "quote" });
      if (res.action !== "quote") {
        setError("Unexpected response from server.");
        return;
      }
      const rawOc = res.order_cancellation as Record<string, unknown>;
      const oc = parseOrderCancellation(rawOc);
      if (!oc) {
        setError("Unexpected response from server.");
        return;
      }
      if (oc.status === "confirmed") {
        await onBookingRefresh();
        showCancellationSuccess(oc, bookingRefNo);
        return;
      }
      setQuote(oc);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cancellation quote.");
    } finally {
      setBusy(false);
    }
  }, [bookingId, bookingRefNo, onBookingRefresh, showCancellationSuccess]);

  const confirmCancel = useCallback(async () => {
    if (!quote?.order_cancellation_id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postFlightBookingCancel(bookingId, {
        action: "confirm",
        order_cancellation_id: quote.order_cancellation_id,
      });
      if (res.action !== "confirm") {
        setError("Unexpected response from server.");
        return;
      }
      const rawOc = res.order_cancellation as Record<string, unknown>;
      const oc = parseOrderCancellation(rawOc);
      const ref = bookingRefFromResponse(res.booking as Record<string, unknown> | undefined, bookingRefNo);
      setModalOpen(false);
      setQuote(null);
      await onBookingRefresh();
      const bookingRaw = res.booking as Record<string, unknown> | undefined;
      const paymentStatus =
        typeof bookingRaw?.payment_status === "string" ? bookingRaw.payment_status : "";
      if (paymentStatus === "refund_processing") {
        try {
          await getFlightBookingCancelStatus(bookingId);
          await onBookingRefresh();
        } catch {
          // best-effort status sync when refund is async
        }
      }
      if (oc) {
        showCancellationSuccess(oc, ref);
      } else {
        setSuccessPayload({
          bookingRefNo: ref,
          refundDisplay: null,
          refundToHuman: "your original payment method",
          isCredits: false,
          confirmedAtLabel: null,
        });
        setSuccessOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm cancellation.");
    } finally {
      setBusy(false);
    }
  }, [bookingId, quote, bookingRefNo, onBookingRefresh, showCancellationSuccess]);

  const retryRefund = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await postFlightBookingRefundRetry(bookingId);
      await onBookingRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund retry failed.");
    } finally {
      setBusy(false);
    }
  }, [bookingId, onBookingRefresh]);

  const pollStatus = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await getFlightBookingCancelStatus(bookingId);
      await onBookingRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh status.");
    } finally {
      setBusy(false);
    }
  }, [bookingId, onBookingRefresh]);

  useEffect(() => {
    onActionsReady?.({ openQuote: () => void openQuote(), busy });
  }, [onActionsReady, openQuote, busy]);

  if (!hasDuffelOrder) return null;

  const showCancelCta = status === "confirmed";
  const showRefundRetry = status === "cancelled" && paymentStatus === "refund_failed";
  const showRefundPending = status === "cancelled" && paymentStatus === "refund_processing";
  const showRefundComplete =
    status === "cancelled" &&
    (paymentStatus === "refunded" ||
      paymentStatus === "partially_refunded" ||
      paymentStatus === "credit_issued");

  if (!showCancelCta && !showRefundRetry && !showRefundPending && !showRefundComplete && !embedded) return null;

  const refundLabel =
    quote?.refund_amount && quote.refund_currency
      ? formatPrice(Number.parseFloat(String(quote.refund_amount)), quote.refund_currency.toUpperCase(), locale)
      : null;

  return (
    <>
      {!embedded ? (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cancel booking</h2>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      {showCancelCta ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Request a cancellation quote from the airline. You can review refund details before confirming.
          </p>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void openQuote()}>
            {busy ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                <span className="ml-2">Please wait</span>
              </>
            ) : (
              "Cancel flight"
            )}
          </Button>
        </div>
      ) : null}

      {showRefundComplete ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {tMoney(`paymentStatusLabel.${paymentStatus}` as "paymentStatusLabel.refunded")}
          </p>
          {tMoney.has(`paymentStatusHint.${paymentStatus}`) ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {tMoney(`paymentStatusHint.${paymentStatus}` as "paymentStatusHint.refunded")}
            </p>
          ) : null}
        </div>
      ) : null}

      {showRefundPending ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            {tMoney("cancelRefundProcessing")}
          </p>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void pollStatus()}>
            Refresh status
          </Button>
        </div>
      ) : null}

      {showRefundRetry ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-destructive">
            {tMoney("cancelRefundFailed")}
          </p>
          <Button type="button" variant="primary" disabled={busy} onClick={() => void retryRefund()}>
            {busy ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                <span className="ml-2">Please wait</span>
              </>
            ) : (
              tMoney("cancelRefundRetry")
            )}
          </Button>
        </div>
      ) : null}
    </section>
      ) : embedded && (showRefundRetry || showRefundPending || showRefundComplete || error) ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cancellation</h2>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          {showRefundComplete ? (
            <p className="mt-2 text-sm text-foreground">
              {tMoney(`paymentStatusLabel.${paymentStatus}` as "paymentStatusLabel.refunded")}
            </p>
          ) : null}
          {showRefundPending ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-muted-foreground">{tMoney("cancelRefundProcessing")}</p>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void pollStatus()}>
                Refresh status
              </Button>
            </div>
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
            setQuote(null);
          }
        }}
        title="Confirm cancellation"
      >
        {quote ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Review the airline&apos;s cancellation terms below. Confirming will cancel your ticket.
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <dt className="text-muted-foreground">Refund to</dt>
              <dd className="font-medium capitalize text-foreground">
                {quote.refund_to?.replace(/_/g, " ") ?? "—"}
              </dd>
              {refundLabel ? (
                <>
                  <dt className="text-muted-foreground">Quoted refund</dt>
                  <dd className="font-medium text-foreground">{refundLabel}</dd>
                </>
              ) : null}
              {quote.quote_expires_at ? (
                <>
                  <dt className="text-muted-foreground">Quote expires</dt>
                  <dd className="text-foreground">{new Date(quote.quote_expires_at).toLocaleString()}</dd>
                </>
              ) : null}
            </dl>
            {quote.refund_to === "airline_credits" ? (
              <p className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
                This cancellation issues airline credits instead of a card refund. Codes are provided after
                confirmation.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setModalOpen(false);
                  setQuote(null);
                }}
              >
                Close
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmCancel()}>
                {busy ? (
                  <>
                    <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                    <span className="ml-2">Please wait</span>
                  </>
                ) : (
                  "Confirm cancellation"
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
          setSuccessPayload(null);
        }}
        title="Cancellation confirmed"
        className="max-w-md"
      >
        {successPayload ? (
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="font-medium text-foreground">Your flight is cancelled</p>
                <p className="mt-1 text-muted-foreground">
                  We&apos;ve sent a confirmation email to the address on your booking with refund or credit details and
                  what to expect next.
                </p>
              </div>
            </div>
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <dt className="text-muted-foreground">Booking reference</dt>
              <dd className="font-semibold text-foreground">{successPayload.bookingRefNo}</dd>
              {successPayload.refundDisplay ? (
                <>
                  <dt className="text-muted-foreground">
                    {successPayload.isCredits ? "Travel credit (quoted)" : "Refund (quoted)"}
                  </dt>
                  <dd className="font-semibold text-foreground">
                    {formatPrice(
                      successPayload.refundDisplay.amount,
                      successPayload.refundDisplay.currency,
                      locale,
                    )}
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">Refund to</dt>
              <dd className="capitalize text-foreground">{successPayload.refundToHuman}</dd>
              {successPayload.confirmedAtLabel ? (
                <>
                  <dt className="text-muted-foreground">Confirmed at</dt>
                  <dd className="text-foreground">{successPayload.confirmedAtLabel}</dd>
                </>
              ) : null}
            </dl>
            <p className="text-muted-foreground">
              {successPayload.isCredits
                ? "Use your airline PNR on the carrier’s site to view or redeem travel credit."
                : "Card refunds often appear within 5–10 business days. Scroll to Payment timeline on this page to track each step."}
            </p>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setSuccessOpen(false);
                  setSuccessPayload(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
