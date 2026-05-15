"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { useLocale } from "next-intl";
import {
  getFlightBookingCancelStatus,
  postFlightBookingCancel,
  postFlightBookingRefundRetry,
} from "@/lib/http/flights.client";

type OrderCancellationQuote = {
  order_cancellation_id: string;
  status?: string;
  refund_amount?: string | null;
  refund_currency?: string | null;
  refund_to?: string | null;
  quote_expires_at?: string | null;
};

export function FlightBookingCancelPanel({
  bookingId,
  status,
  paymentStatus,
  hasDuffelOrder,
  onBookingRefresh,
}: {
  bookingId: string;
  status: string;
  paymentStatus: string;
  hasDuffelOrder: boolean;
  onBookingRefresh: () => Promise<void>;
}) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [quote, setQuote] = useState<OrderCancellationQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openQuote = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postFlightBookingCancel(bookingId, { action: "quote" });
      if (res.action !== "quote") {
        setError("Unexpected response from server.");
        return;
      }
      const oc = res.order_cancellation as OrderCancellationQuote;
      if (oc.status === "confirmed") {
        await onBookingRefresh();
        return;
      }
      setQuote(oc);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cancellation quote.");
    } finally {
      setBusy(false);
    }
  }, [bookingId]);

  const confirmCancel = useCallback(async () => {
    if (!quote?.order_cancellation_id) return;
    setBusy(true);
    setError(null);
    try {
      await postFlightBookingCancel(bookingId, {
        action: "confirm",
        order_cancellation_id: quote.order_cancellation_id,
      });
      setModalOpen(false);
      setQuote(null);
      await onBookingRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm cancellation.");
    } finally {
      setBusy(false);
    }
  }, [bookingId, quote, onBookingRefresh]);

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

  if (!hasDuffelOrder) return null;

  const showCancelCta = status === "confirmed";
  const showRefundRetry = status === "cancelled" && paymentStatus === "refund_failed";
  const showRefundPending = status === "cancelled" && paymentStatus === "refund_processing";

  if (!showCancelCta && !showRefundRetry && !showRefundPending) return null;

  const refundLabel =
    quote?.refund_amount && quote.refund_currency
      ? formatPrice(Number.parseFloat(String(quote.refund_amount)), quote.refund_currency.toUpperCase(), locale)
      : null;

  return (
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

      {showRefundPending ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Your card refund is processing. This can take a short time to complete with our payments partner.
          </p>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void pollStatus()}>
            Refresh status
          </Button>
        </div>
      ) : null}

      {showRefundRetry ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-destructive">
            The booking was cancelled but the automatic card refund did not complete. You can retry once your
            connection is stable.
          </p>
          <Button type="button" variant="primary" disabled={busy} onClick={() => void retryRefund()}>
            {busy ? (
              <>
                <Loader2 className="inline h-4 w-4 animate-spin align-middle" aria-hidden />
                <span className="ml-2">Please wait</span>
              </>
            ) : (
              "Retry refund"
            )}
          </Button>
        </div>
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
    </section>
  );
}
